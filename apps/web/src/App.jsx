import { useEffect, useState } from "react";

function App() {
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("API request failed");
        }

        return response.json();
      })
      .then((data) => {
        setApiStatus(data.status);
      })
      .catch(() => {
        setApiStatus("error");
      });
  }, []);

  return (
    <main>
      <h1>VeltraX</h1>
      <p>Agentic Security Extension for Veltra</p>

      <p>API status: {apiStatus}</p>
    </main>
  );
}

export default App;