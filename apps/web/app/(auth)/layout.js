import Clerk from "@/components/clerk";
import Header from "@/components/header";

// Always wrapped: these pages are Clerk's own sign-in and sign-up components,
// which cannot render without the provider.
const AuthLayout = ({ children }) => {
  return (
    <Clerk>
      <Header />
      <div className="flex justify-center pt-40">{children}</div>
    </Clerk>
  );
};

export default AuthLayout;
