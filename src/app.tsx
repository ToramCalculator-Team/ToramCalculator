// @refresh reload
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";

export default function App() {
  return (
    <Router root={(props) => props.children}>
      <FileRoutes />
    </Router>
  );
}
