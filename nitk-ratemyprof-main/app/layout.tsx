import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "NITK RateMyProf",
  description: "Anonymous professor reviews for the campus.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        <Toaster 
          position="bottom-center" 
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '10px',
            },
          }} 
        />
        {children}
      </body>
    </html>
  );
}
