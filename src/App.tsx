import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Theme } from "@carbon/react";

import MainLayout from "./layout/MainLayout";
import HomePage from "./pages/HomePage";
import ProcessPage from "./pages/ProcessPage";
import DeltaPage from "./pages/DeltaPage";
import ValidationPage from "./pages/ValidationPage";
import TeamPage from "./pages/TeamPage";
import NotFound from "./pages/NotFound";
import WatsonOrchestrate from "./components/WatsonOrchestrate";

const queryClient = new QueryClient();

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <Theme theme="g100">
      <BrowserRouter>
        <WatsonOrchestrate />
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="process" element={<ProcessPage />} />
            <Route path="delta" element={<DeltaPage />} />
            <Route path="validate" element={<ValidationPage />} />
            <Route path="team" element={<TeamPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </Theme>
  </QueryClientProvider>
);

export default App;

// Made with Bob
