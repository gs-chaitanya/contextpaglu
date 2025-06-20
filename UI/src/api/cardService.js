// Function to fetch cards from API
export const fetchCards = async () => {
  try {
    // Replace with your actual API endpoint
    const response = await fetch("http://localhost:8000/list_all_sessions");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const respJSON = await response.json();

    const data = respJSON["sessions"].map((item) => ({
      session_id: item[0],
      name: item[1],
      context: item[2]
    }))

    return data;
  } catch (error) {
    console.error("Error fetching cards:", error);
    // Return fallback data in case API fails
    return [
      { session_id: "sadsad-dsa-da-sdsa-d-sad", name: "Analytics Dashboard", context: "Improved SVG Path:The new SVG path represents a more modern and recognizable speaker icon with sound waves.Design Enhancements:The icon is visually cleaner and better suited for UI/UX purposes.Retained White Fill ensures the icon matches the intended design." },
      { session_id: "session_2", name: "User Management", context: "sdsdfsd" },
      { session_id: "session_3", name: "System Settings", context: "sdsdfsd" },
      { session_id: "session_4", name: "Reporting Tools", context: "sdsdfsd" },
      { session_id: "session_5", name: "Security Controls", context: "sdsdfsd" },
      { session_id: "session_6", name: "Integration Hub", context: "sdsdfsd" },
    ];
  }
};