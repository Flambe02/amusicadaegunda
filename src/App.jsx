import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { HelmetProvider } from 'react-helmet-async';
import OfflineIndicator from "@/components/OfflineIndicator"
// import TikTokDemo from "./pages/TikTokDemo";

function App() {
  return (
    <HelmetProvider>
      <OfflineIndicator />
      <Pages />
      {/* <TikTokDemo /> */}
      <Toaster />
    </HelmetProvider>
  )
}

export default App 