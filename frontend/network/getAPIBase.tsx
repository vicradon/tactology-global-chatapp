export default function getAPIBaseURL() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("API_BASE_URL");
  }

  return "";
}
