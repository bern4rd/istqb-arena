import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import App from "./App";

// Mock do window.matchMedia para o ambiente JSDOM
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock do provedor do Google OAuth para evitar problemas no JSDOM
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <div data-testid="mock-google-login">Google Login Mock</div>,
}));

describe("App Theme Toggle (Modo Escuro Global)", () => {
  beforeEach(() => {
    // Limpa o localStorage antes de cada teste
    localStorage.clear();
    // Limpa as classes do documentElement
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
  });

  it("deve renderizar o botão de alternar tema", () => {
    render(<App />);
    const themeBtn = screen.getByLabelText("Toggle Theme");
    expect(themeBtn).toBeInTheDocument();
  });

  it("deve iniciar com o tema 'light' se não houver preferência anterior", () => {
    render(<App />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem("istqb_theme")).toBe("light");
  });

  it("deve alternar para o tema 'dark' ao clicar no botão", () => {
    render(<App />);
    const themeBtn = screen.getByLabelText("Toggle Theme");

    // Clica para alternar para Dark Mode
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(localStorage.getItem("istqb_theme")).toBe("dark");

    // Clica novamente para alternar de volta para Light Mode
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem("istqb_theme")).toBe("light");
  });

  it("deve persistir e restaurar a preferência de tema do localStorage na inicialização", () => {
    // Configura previamente no localStorage para inicializar em dark mode
    localStorage.setItem("istqb_theme", "dark");
    
    render(<App />);
    
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});
