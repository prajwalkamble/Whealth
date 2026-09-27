import Header from "@/components/header";
import Footer from "@/components/footer";

// The public pages keep the marketing header and footer. The signed-in app
// lives under (main), which has its own sidebar shell instead.
const MarketingLayout = ({ children }) => {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
};

export default MarketingLayout;
