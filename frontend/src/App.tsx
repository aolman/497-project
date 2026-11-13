import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { ErrorState, Loading, Shell } from "./components/ui";
import Welcome from "./screens/Welcome";
import SetupSources from "./screens/SetupSources";
import SetupBuffer from "./screens/SetupBuffer";
import Home from "./screens/Home";
import LogIncome from "./screens/LogIncome";
import LogExpense from "./screens/LogExpense";
import Explainer from "./screens/Explainer";
import ActivityScreen from "./screens/Activity";
import Plan from "./screens/Plan";
import SettingsScreen from "./screens/Settings";
import Bills from "./screens/Bills";

const SETUP_PATHS = ["/welcome", "/setup/sources", "/setup/buffer"];

export default function App() {
  const location = useLocation();
  const status = useQuery({ queryKey: ["status"], queryFn: api.status });

  if (status.isLoading) {
    return (
      <Shell>
        <Loading label="Opening Steady" />
      </Shell>
    );
  }
  if (status.isError) {
    return (
      <Shell>
        <div className="p-4">
          <ErrorState error={status.error} retry={() => status.refetch()} />
          <p className="mt-4 px-1 text-[15px] text-ink-muted">
            Start it from the <code>backend</code> folder with <code>uvicorn main:app --reload</code>, then try again.
          </p>
        </div>
      </Shell>
    );
  }

  const onboarded = status.data!.onboarded;
  const inSetup = SETUP_PATHS.includes(location.pathname);
  if (!onboarded && !inSetup) return <Navigate to="/welcome" replace />;
  if (onboarded && location.pathname === "/welcome") return <Navigate to="/" replace />;

  return (
    <Shell>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/setup/sources" element={<SetupSources />} />
        <Route path="/setup/buffer" element={<SetupBuffer />} />
        <Route path="/" element={<Home />} />
        <Route path="/log/income" element={<LogIncome />} />
        <Route path="/log/expense" element={<LogExpense />} />
        <Route path="/explainer" element={<Explainer />} />
        <Route path="/activity" element={<ActivityScreen />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
