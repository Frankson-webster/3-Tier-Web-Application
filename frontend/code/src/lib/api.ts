import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Student {
  id: number;
  name: string;
  age: number;
  class: string;
  created_at: string;
}

export const api = {
  async getStudents() {
    const response = await axios.get<Student[]>(`${API_URL}/students`);
    return response.data;
  },

  async createStudent(student: Omit<Student, 'id' | 'created_at'>) {
    const response = await axios.post<{ id: number }>(`${API_URL}/students`, student);
    return response.data;
  },

  async deleteStudent(id: number) {
    await axios.delete(`${API_URL}/students/${id}`);
  }
};