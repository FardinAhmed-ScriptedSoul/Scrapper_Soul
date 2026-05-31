// import { useState, useEffect, useCallback } from 'react';
// import axios from 'axios';

// axios.defaults.withCredentials = true;

// const BACKEND_BASE_URL = 'http://localhost:3000'; 

// export const useTelemetry = (pollInterval = 4000) => {
//   const [data, setData] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const fetchTelemetry = useCallback(async () => {
//     try {
//       // ✅ ALIGNED PATH: Matches your app.js V1 API mounting layout exactly
//       const targetUrl = `${BACKEND_BASE_URL}/api/v1/dashboard/telemetry`;
//       const response = await axios.get(targetUrl);
      
//       if (response.data && response.data.success === true) {
//         setData({
//           totalHarvested: response.data.totalHarvested ?? 0,
//           activeTasks: response.data.activeTasks ?? 0,
//           successRate: response.data.successRate ?? 100,
//           bandwidth: response.data.bandwidth ?? "0 MB/s",
//           systemHealth: {
//             memory: response.data.systemHealth?.memory ?? 0,
//             cpu: response.data.systemHealth?.cpu ?? 0,
//             throttleFaults: response.data.systemHealth?.throttleFaults ?? 0
//           },
//           liveLogs: response.data.liveLogs || []
//         });
//         setError(null);
//       } else {
//         setError("Invalid response status flag received from Mainframe Telemetry.");
//       }
//     } catch (err) {
//       console.error("Telemetry Link Failure:", err);
//       setError(
//         err.response?.data?.message || 
//         err.message || 
//         "Network Error: Bridge dropped."
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchTelemetry();
//     const liveLoopToken = setInterval(fetchTelemetry, pollInterval);
//     return () => clearInterval(liveLoopToken);
//   }, [fetchTelemetry, pollInterval]);

//   return {
//     data,
//     isLoading,
//     error,
//     refresh: fetchTelemetry
//   };
// };




import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/api.js';

export const useTelemetry = (pollInterval = 4000) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTelemetry = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/telemetry');
      const resData = response?.data || response;

      if (resData && resData.success === true) {
        setData({
          totalHarvested: resData.totalHarvested ?? 0,
          activeTasks: resData.activeTasks ?? 0,
          successRate: resData.successRate ?? 100,
          bandwidth: resData.bandwidth ?? "0 MB/s",
          systemHealth: {
            memory: resData.systemHealth?.memory ?? 0,
            cpu: resData.systemHealth?.cpu ?? 0,
            throttleFaults: resData.systemHealth?.throttleFaults ?? 0
          },
          liveLogs: resData.liveLogs || []
        });
        setError(null);
      } else {
        setError("Invalid response status flag received from Mainframe Telemetry.");
      }
    } catch (err) {
      console.error("Telemetry Link Failure:", err);
      setError(err.response?.data?.message || err.message || "Network Error: Bridge dropped.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const liveLoopToken = setInterval(fetchTelemetry, pollInterval);
    return () => clearInterval(liveLoopToken);
  }, [fetchTelemetry, pollInterval]);

  return { data, isLoading, error, refreshTelemetry: fetchTelemetry };
};

export default useTelemetry; // 🚀 Double safety fallback export