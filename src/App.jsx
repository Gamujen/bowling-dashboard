import { useState } from "react";
import Home from "./pages/Home";
import ProfileSelect from "./pages/ProfileSelect";
import FrontDeskDashboard from "./pages/FrontDeskDashboard";

export default function App() {
  const [screen, setScreen] = useState("home");

  if (screen === "home") {
    return <Home goNext={() => setScreen("profile")} />;
  }

  if (screen === "profile") {
    return (
      <ProfileSelect goFrontDesk={() => setScreen("frontdesk")} />
    );
  }

  if (screen === "frontdesk") {
    return <FrontDeskDashboard />;
  }
}