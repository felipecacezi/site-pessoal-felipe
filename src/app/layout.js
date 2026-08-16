import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import "./globals.css";

export const metadata = {
  title: "Felipe Silva | Desenvolvedor de Sistemas",
  description: "Felipe Silva - Desenvolvedor sênior de sistemas com mais de 10 anos de experiência especializada em arquiteturas robustas e escaláveis.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-background dark:bg-[#121210] text-on-background dark:text-[#fcf9f4] font-sans antialiased selection:bg-secondary-container selection:text-on-secondary-container transition-colors duration-300">
        <AuthProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
