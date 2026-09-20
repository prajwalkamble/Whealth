import Header from "@/components/header";

// The public pages keep the marketing header and footer. The signed-in app
// lives under (main), which has its own sidebar shell instead.
const MarketingLayout = ({ children }) => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>
            &copy; {currentYear}, <strong>Whealth.</strong> All rights reserved.
          </p>
          <p>
            Developed by{" "}
            <strong>
              <a href="https://prajwalpk.vercel.app" target="_blank">
                Prajwal Kamble.
              </a>
            </strong>
          </p>
        </div>
      </footer>
    </>
  );
};

export default MarketingLayout;
