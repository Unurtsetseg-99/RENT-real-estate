import "@/styles/global.css";
import { AuthProvider } from "@/context/AuthContext";
import { LangProvider } from "@/context/LangContext";
import { MessagesProvider } from "@/context/MessagesContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AiChatWidget from "@/components/AiChatWidget";

export const metadata = {
  title: "RENT",
  description: "Ulaanbaatar's trusted real estate platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <LangProvider>
          <AuthProvider>
            <MessagesProvider>
              <div className="app-shell">
                <Navigation />
                <main className="page-shell">{children}</main>
                <Footer />
                <AiChatWidget />
              </div>
            </MessagesProvider>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
