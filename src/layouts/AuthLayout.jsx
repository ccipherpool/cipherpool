import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "#020617" }}>
      <Outlet />
    </div>
  );
}