# Steady: run the demo

You need **Python 3.10+**, **Node.js 18+** and **git**.

## 1. Clone the repo

```bash
git clone https://github.com/aolman/497-project.git
cd 497-project
git checkout foundational-architecture
```

## 2. Start the backend (Terminal 1)

```bash
cd backend
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload
```

Leave this terminal running.

## 3. Start the frontend (Terminal 2)

Open a second terminal in the `497-project` folder:

```bash
cd frontend
npm install
npm run dev
```

Leave this terminal running too.

## 4. Open the app

Go to **http://localhost:5173** in your browser.

The app opens on Home with demo data for "Maya."

## Reset the demo

In the app, go to **Settings**, then scroll to **For test sessions**:

- **Load demo week:** back to Maya's data
- **Start fresh:** empty app, starting at the Welcome screen

## If something goes wrong

- **"Can't reach the Steady server":** Terminal 1 (backend) isn't running. Start it again.
- **`python` or `pip` not found:** use `python3` and `pip3` instead.
- **"Port already in use":** the app is already running in another terminal. Close it, then try again.
