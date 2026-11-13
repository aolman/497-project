"""End-to-end check: seed Maya's data, then hit the API like the app would."""
import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    path = tmp_path_factory.mktemp("db") / "test.db"
    os.environ["STEADY_DB"] = str(path)
    here = Path(__file__).parent
    subprocess.run([sys.executable, "seed.py"], cwd=here, env=os.environ, check=True, capture_output=True)
    import db
    db.DB_PATH = str(path)
    import main
    return TestClient(main.app)


def test_home_shows_worked_example(client):
    r = client.get("/summary").json()
    assert r["safe_to_spend_exact"] == 187.80
    assert r["display"] == "About $170 – $190"


def test_logging_an_expense_lowers_safe_to_spend(client):
    assert client.post("/expenses", json={"amount": 20, "category": "groceries"}).status_code == 201
    assert client.get("/summary").json()["safe_to_spend_exact"] == 167.80


def test_bad_inputs_are_rejected(client):
    assert client.post("/expenses", json={"amount": -10, "category": "gas"}).status_code == 422
    assert client.post("/expenses", json={"amount": 10, "category": "yachts"}).status_code == 400


def test_log_income_returns_breakdown(client):
    r = client.post("/income", json={"source_id": 1, "amount": 94}).json()
    assert r["breakdown"] == {"amount": 94.0, "tax": 18.8, "cushion": 14.1, "toward_spending": 61.1}


def test_status_and_reset_flow(client):
    assert client.get("/status").json()["onboarded"] is True
    s = client.post("/reset", json={"mode": "empty"}).json()
    assert s["onboarded"] is False and s["sources"] == 0
    assert client.post("/setup/complete").status_code == 400          # needs a source first
    src = client.post("/sources", json={"name": "Lyft"}).json()
    client.put("/settings", json={"tax_rate": 0.15, "cushion_level": "light", "name": "Sam"})
    assert client.post("/setup/complete").json()["onboarded"] is True
    client.post("/income", json={"source_id": src["id"], "amount": 200})
    r = client.get("/summary").json()
    assert r["name"] == "Sam" and r["safe_to_spend_exact"] == 160.0   # 200 - 30 tax - 10 cushion
    client.post("/reset", json={"mode": "demo"})
    assert client.get("/summary").json()["safe_to_spend_exact"] == 187.80


def test_activity_lists_and_deletes_entries(client):
    client.post("/reset", json={"mode": "demo"})
    e = client.post("/expenses", json={"amount": 12.5, "category": "dining", "note": "Tacos"}).json()
    a = client.get("/activity").json()
    assert a["income"] == 412.0 and a["spent"] == 12.5
    assert any(i["kind"] == "expense" and i["label"] == "dining" for i in a["items"])
    assert client.delete(f"/expenses/{e['id']}").json()["deleted"] is True
    assert client.get("/activity").json()["spent"] == 0.0


def test_planner_what_if_income(client):
    client.post("/reset", json={"mode": "demo"})
    r = client.get("/plan", params={"income": 250}).json()
    assert r["safe_to_spend_exact"] == 82.50                          # 250 - 50 - 37.50 - 80
    assert r["covers_bills_and_taxes"] is True


def test_bills_have_status(client):
    client.post("/reset", json={"mode": "demo"})
    bills = client.get("/bills").json()
    assert len(bills) == 4
    assert {b["name"]: b["status"] for b in bills}["Apartment rent"] == "saving"
