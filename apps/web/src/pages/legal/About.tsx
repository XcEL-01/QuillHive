export function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">About QuillHive</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Where everyone gathers — to share, learn, and connect.
        </p>
      </div>

      <div className="space-y-12">
        <section className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-purple-600 mb-3">Our Story</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            QuillHive began as a small community for writers and artists, but the people who showed up
            kept widening what it could be — students, professionals, builders, parents, travelers,
            educators, hobbyists, and the simply curious. Today, QuillHive is a public square open to
            anyone, anywhere in the world. Whatever you have to share — a story, a question, a photo,
            a poem, a project, a perspective — there is a place for you here.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">What QuillHive is for</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-lg mb-2">Anyone, anywhere</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Built for everyone worldwide — not just creators. Show up as you are.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-lg mb-2">Long & short form</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Post a quick update, a photo, an essay, a poem, a podcast — your choice.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-lg mb-2">Real conversations</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Threaded comments, highlights, polls, groups. No noise, no algorithm rage.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-lg mb-2">Privacy & safety first</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Block, report, content warnings, moderation — built in from day one.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Join the community</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Whether you're here to share what you make, learn something new, find your people, or
            simply read and listen — welcome. QuillHive is for you.
          </p>
          <div className="flex gap-4">
            <a href="/register" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Join QuillHive
            </a>
            <a href="/explore" className="px-6 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20">
              Explore
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
