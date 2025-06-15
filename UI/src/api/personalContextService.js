export const fetchPersonalContext = async (userId) => {
  try {
    // Replace with your actual API endpoint
    const response = await fetch(`http://localhost:8000/get_personal_context`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching personal context:", error);
    throw error; // Re-throw the error for further handling
  }
};

export const savePersonalContext= async (userId, contextData) => {
  try {
    const response = await fetch(`http://localhost:8000/update_personal_context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contextData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error saving personal context:", error);
    throw error; // Re-throw the error for further handling
  }
}