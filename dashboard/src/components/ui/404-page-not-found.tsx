export function NotFoundPage() {
  const handleGoHome = () => {
    // Navigate to landing page using pushState to work with the app's routing
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section className="bg-white font-serif min-h-screen flex items-center justify-center">
      <div className="container mx-auto">
        <div className="flex justify-center">
          <div className="w-full sm:w-10/12 md:w-8/12 text-center">
            <div className="h-[250px] sm:h-[350px] md:h-[400px] bg-center bg-no-repeat bg-contain flex items-center justify-center">
              <h1 className="text-center text-black text-6xl sm:text-7xl md:text-8xl">
                404
              </h1>
            </div>

            <div className="mt-[-50px]">
              <h3 className="text-2xl text-black sm:text-3xl font-bold mb-4">
                Look like you're lost
              </h3>
              <p className="mb-6 text-black sm:mb-5">
                The page you are looking for is not available!
              </p>

              <button
                onClick={handleGoHome}
                className="my-5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}