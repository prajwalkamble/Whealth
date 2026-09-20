import Header from "@/components/header";

const AuthLayout = ({ children }) => {
  return (
    <>
      <Header />
      <div className="flex justify-center pt-40">{children}</div>
    </>
  );
};

export default AuthLayout;
