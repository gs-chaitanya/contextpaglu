export const translateText = async (text) => {
    const response = await fetch(`http://localhost:8000/translate/${text}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}