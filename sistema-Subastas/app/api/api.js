const API_URL = "http://localhost:3001/api";

// Obtener criterios de validación de un postor específico
export async function getTablaValidaciones(id_postor) {
  const response = await fetch(`${API_URL}/criterios-postor/${id_postor}`);
  
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data = await response.json();
  return data;
}
