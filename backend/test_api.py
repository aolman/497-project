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
