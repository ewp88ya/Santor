import { useState } from "react";

import { Button } from "@santor/ui";
import { apiClient } from "@santor/api-client";


export default function App() {
  const [status, setStatus] = useState<string>("");


  async function testApi() {
    const response = await apiClient<{
      status: string;
      service: string;
      timestamp: string;
    }>("/api/v1/health");

    setStatus(
      `${response.status} - ${response.service}`
    );
  }


  return (
    <main>
      <section>
        <h1>Santor Web</h1>

        <p>
          Frontend workspace berhasil terhubung dengan shared UI
        </p>

        <Button />

        <br />

        <button onClick={testApi}>
          Test API Connection
        </button>

        <p>
          {status}
        </p>
      </section>
    </main>
  );
}
