import { HandWrittenTitle } from "./hand-writing-text";

// Example integration showing how to use HandWrittenTitle in your app
export function IntegrationExample() {
  return (
    <div className="space-y-8">
      {/* Example 1: Hero section with hand-written title */}
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <HandWrittenTitle 
          title="Shame The Web" 
          subtitle="Performance coach for your browser"
        />
      </section>

      {/* Example 2: Feature section */}
      <section className="bg-gray-900 text-white">
        <HandWrittenTitle 
          title="Real Performance" 
          subtitle="No fake tests. Just real browsing data."
        />
      </section>

      {/* Example 3: Simple heading */}
      <section>
        <HandWrittenTitle title="Get Started" />
      </section>
    </div>
  );
}

// You can also use it in your existing landing page like this:
export function LandingPageHero() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <HandWrittenTitle 
        title="The web has been getting away with murder" 
        subtitle="Let's shame it into better performance"
      />
    </div>
  );
}