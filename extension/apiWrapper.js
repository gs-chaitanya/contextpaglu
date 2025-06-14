// apiWrapper.js

export async function postSessionCheck(conversationId, service) 
{
    return false;
//   try {
//     const response = await fetch("http://localhost:8000/check_session", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         conversationId,
//         service,
//       }),
//     });

//     if (!response.ok) throw new Error("Network response was not ok");

//     const data = await response.json();
//     return data.exists; // expecting { "exists": true } or false
//   } catch (error) {
//     console.error("API call failed:", error);
//     return false;
//   }
}
