export interface CardTemplate {
  html: string;
  messages: MessageTemplate[];
}

export interface ColumnTemplate {
  name: string;
  cards: CardTemplate[];
}

export interface BoardTemplate {
  columns: ColumnTemplate[];
}

export interface MessageTemplate {
  html: string;
}

export const BOARD_DEMO_TEMPLATE: BoardTemplate = {
  columns: [
    {
      name: 'Backlog',
      cards: [
        {
          html: '<p>Define Project Scope: LocalAI</p><p>Create initial project definition for our local AI desktop app. Define core requirements and principles that keep user data on their machines instead of remote servers.</p><p>Why this matters: Cloud-based AI creates privacy concerns that are fundamentally unsolvable. Running models locally offers an architectural solution rather than a policy band-aid.</p><p>Deliverables:</p><ul><li>Project requirements doc</li><li>Technical constraints list</li><li>Initial architecture diagram</li></ul>',
          messages: [
            {
              html: "<p>Rob: I've started drafting this. Need to figure out what we're actually building first before diving into code. The hard part isn't implementation but getting clarity on what 'local-first AI' really means in practice. Anyone have specific inputs?</p>",
            },
            {
              html: "<p>Sarah: Let's make sure we prioritize the local-first approach in all decisions. This isn't just a feature but our core differentiator. If a design decision forces data to leave the user's machine, we should reconsider it from first principles.</p>",
            },
          ],
        },
        {
          html: '<p>Research Target User Segments</p><p>Interview potential users and document primary use cases. Identify priority segments for initial release.</p><p>Current findings:</p><ul><li>Developers: Want direct control over models and data</li><li>Content creators: Need AI help without ongoing costs</li><li>Small businesses: Looking for custom workflows with minimal technical overhead</li></ul><p>The distinction between these groups matters because it affects our technical decisions. Each has different tolerance for complexity vs. capability.</p>',
          messages: [
            {
              html: "<p>Tom: Makes sense to focus on developers first. They'll tolerate rough edges and help improve the core. History suggests that developer tools often expand outward to other audiences once the foundation is solid.</p>",
            },
            {
              html: '<p>Rob: Agreed. We should interview at least 5 more developers to validate these assumptions. What we think they want and what they actually need are often different things. Better to discover that now.</p>',
            },
          ],
        },
        {
          html: '<p>Design Initial Technical Architecture</p><p>Develop and document the core technical approach. Select initial stack and create architecture diagram.</p><p>Current direction:</p><ul><li>Go for backend performance and cross-compilation</li><li>Minimal UI with standard web tech</li><li>Local SQLite for storage</li><li>GGUF format support first</li></ul><p>Performance requirement: Keep CPU/memory usage reasonable for average hardware.</p><p>These choices represent tradeoffs between development speed, runtime performance, and cross-platform support. Go gives us compiled speed with manageable complexity.</p>',
          messages: [
            {
              html: '<p>Jen: Created repo at github.com/localai/core. First commit has a basic README and project structure. The architecture decisions we make now will be hard to change later, so worth spending time on.</p>',
            },
            {
              html: "<p>Rob: Looking good. Let's schedule a whiteboarding session to refine the architecture. I'm particularly concerned about how we handle memory management with large models. It's easy to get this wrong in ways that only show up with scaled usage.</p>",
            },
          ],
        },
        {
          html: "<p>Define MVP Features</p><p>Finalize the feature set for v0.1 release. Create tickets for each feature.</p><p>Current proposal:</p><ul><li>Text-only interface</li><li>Support for Llama2 7B quantized</li><li>Basic system prompts</li><li>Save/restore conversations</li><li>Memory settings slider</li></ul><p>The goal isn't to build everything, but to build enough to test our core thesis: that locally-run AI with user control is valuable enough to overcome performance limitations.</p>",
          messages: [
            {
              html: "<p>Rob: Let's just build this first version and ship it. We can figure out what matters by seeing what people actually use. Too many projects die from overplanning instead of building. The feedback from one real user is worth more than hours of internal debate.</p>",
            },
            {
              html: '<p>Sarah: I can break this down into individual development tasks by Friday. I think we should be ruthless about scope - better a working product with fewer features than an almost-working product with many.</p>',
            },
          ],
        },
        {
          html: "<p>Design User Interface</p><p>Create wireframes and UI specification for the application. Focus on usability and clear information display.</p><p>Requirements:</p><ul><li>Text input/output interface for v1</li><li>Clear indicator when processing locally</li><li>Memory usage display</li><li>Sensible defaults with advanced settings tucked away</li></ul><p>The UI needs to make the local-first nature of the app evident - users should understand where their data is and what's happening with computation resources.</p>",
          messages: [
            {
              html: "<p>Tom: I've sketched some layouts. The main chat view with a simple sidebar seems most practical. Uploading to the shared drive. I'm trying to balance simplicity with transparency - users need to understand what's happening without being overwhelmed by technical details.</p>",
            },
            {
              html: '<p>Sarah: I like the direction. Can we discuss the settings panel tomorrow? I keep thinking about the tension between exposing technical controls vs. making this accessible to non-technical users.</p>',
            },
          ],
        },
        {
          html: "<p>Implement Local Processing Engine</p><p>Develop core processing module for running inference locally. Ensure efficient resource usage and reliability.</p><p>Technical requirements:</p><ul><li>No cloud dependencies in core</li><li>Automatic model quantization options</li><li>Streaming generation essential, even if slower</li><li>Thread count settings for different CPUs</li></ul><p>This is the heart of our application. If this doesn't work well, nothing else matters. The core challenge is balancing performance with memory usage across diverse hardware.</p>",
          messages: [
            {
              html: '<p>Rob: Initial benchmarks: 7B model runs acceptably on my 5-year-old laptop. Generating about 5 tokens/second. Slower than cloud, but still useful for many tasks. The latency feels different than waiting for a remote API.</p>',
            },
            {
              html: "<p>Jen: That's promising. Can we optimize further with some SIMD instructions? Every performance improvement compounds by making the tool more practical for daily use. There's likely a threshold where latency becomes low enough that users stop noticing it.</p>",
            },
          ],
        },
        {
          html: "<p>Plan Distribution Strategy</p><p>Determine how we'll package and distribute the application. Create release automation process.</p><p>Tasks:</p><ul><li>Set up GitHub releases with binaries for major platforms</li><li>Write basic documentation and examples</li><li>Determine license approach (free without artificial limitations)</li><li>Research potential sustainability models</li></ul><p>Distribution matters because installation friction kills adoption. Users should be able to download and start using the app in under 5 minutes.</p>",
          messages: [
            {
              html: "<p>Tom: Let's build something useful first. If people like it, we can figure out how to make it sustainable. History is full of projects that never shipped because they tried to solve monetization before proving value.</p>",
            },
            {
              html: '<p>Sarah: I can help with the release automation setup. Want to use GitHub Actions? I think accessibility goes beyond the UI - it includes how easily people can get the software running on their machines in the first place.</p>',
            },
          ],
        },
        {
          html: "<p>Choose Software License</p><p>Select appropriate open source license for the project. Document decision rationale.</p><p>Options to evaluate:</p><ul><li>MIT: Simple, permissive</li><li>AGPL: Prevents closed forks</li><li>Apache 2.0: Better patent protection</li></ul><p>This isn't just a legal formality - it shapes how people can build on our work and whether commercial entities will feel comfortable adopting it.</p>",
          messages: [
            {
              html: "<p>Rob: Leaning toward MIT. Don't want to create unnecessary barriers for adoption or contributions. The goal should be maximum spread of local-first AI, not restricting how people can use it. Complexity here creates friction.</p>",
            },
            {
              html: "<p>Jen: MIT makes sense for our goals. I'll draft a license file and contributing guidelines. Simplicity in licensing often translates to more adoption. We want companies to be able to include this in their products without legal concerns.</p>",
            },
          ],
        },
        {
          html: "<p>Implement Security Measures</p><p>Develop and document security model for the application. Create security test suite.</p><p>Requirements:</p><ul><li>Model source verification</li><li>Input sanitization</li><li>Plugin isolation</li><li>Clear data storage policies</li></ul><p>Security is inherently part of our value proposition - local-first means users don't expose their data to third parties. We need to deliver on that promise comprehensively.</p>",
          messages: [
            {
              html: "<p>Rob: Started security.md in the docs folder. We'll need outside review before 1.0. Security isn't something we can bolt on later - it needs to be built into the architecture from the beginning.</p>",
            },
            {
              html: '<p>Tom: I know someone with security expertise who might be willing to review. Let me reach out. Most security issues come from unexpected interaction between components rather than individual vulnerabilities.</p>',
            },
          ],
        },
        {
          html: '<p>Establish Community Guidelines</p><p>Set up project community infrastructure and contribution processes. Create templates and documentation.</p><p>Tasks:</p><ul><li>Create contribution guide</li><li>Set up issue templates and labels</li><li>Define release process</li><li>Plan communication channels</li></ul><p>Building a healthy community is as important as building good software. Clear processes reduce friction for new contributors.</p>',
          messages: [
            {
              html: "<p>Tom: I'll monitor the repo daily. No Discord or Slack yet - let's stick to GitHub discussions until we need more. Too many communication channels can fragment the community before it even forms.</p>",
            },
            {
              html: '<p>Sarah: I can help with the issue templates. Used them extensively at my last job. Good templates guide people to provide the information we need and set the tone for how the community interacts.</p>',
            },
          ],
        },
        {
          html: "<p>Implement Model Swapping Feature</p><p>Develop functionality to switch between different locally stored models without restarting the application.</p><p>Technical requirements:</p><ul><li>Dynamic model loading/unloading</li><li>Memory cleanup on switch</li><li>Model metadata storage</li><li>UI for model selection</li></ul><p>This is challenging because most ML frameworks aren't designed for dynamic loading/unloading. Memory management becomes critical.</p>",
          messages: [
            {
              html: '<p>Rob: This would be really useful. Smaller models for quick tasks, larger ones for complex work. The speed vs. capability tradeoff is fundamental to local AI - letting users make that choice dynamically could be a key differentiator.</p>',
            },
            {
              html: '<p>Jen: I can take this on after the core inference engine is stable. The technical challenge is making sure memory is properly released - language models can consume gigabytes that need to be reclaimed.</p>',
            },
          ],
        },
        {
          html: "<p>Develop Offline Mode</p><p>Ensure application works 100% offline after initial model download. Block all unnecessary network access.</p><p>Requirements:</p><ul><li>Functional verification without network</li><li>Explicit permission for any data transfer</li><li>Clear UI indicators for online/offline status</li><li>Local-only operations by default</li></ul><p>This isn't just a feature but core to our philosophy. A local-first app that quietly calls home undermines its own value proposition.</p>",
          messages: [
            {
              html: '<p>Sarah: This should be default behavior. Internet access only needed for deliberate actions like downloading models. Unlike cloud apps that degrade when offline, we should work exactly the same with or without internet.</p>',
            },
            {
              html: '<p>Tom: Agreed. Should we add a network activity monitor to the debug panel? Complete transparency builds trust - users should never wonder if their data is being sent somewhere.</p>',
            },
          ],
        },
        {
          html: '<p>Implement Custom Model Support (BYOM)</p><p>Add functionality for users to load their own fine-tuned models. Support standard model formats.</p><p>Requirements:</p><ul><li>Support for GGUF format</li><li>Support for ONNX format</li><li>Basic validation of model files</li><li>Simple import UI</li></ul><p>The ability to use custom models transforms this from a product to a platform. It significantly expands what users can do.</p>',
          messages: [
            {
              html: '<p>Jen: Essential feature. Should also support TF formats with minimal configuration if possible. The power of local AI is that users can truly own their stack end-to-end, including the models themselves.</p>',
            },
            {
              html: "<p>Rob: Let's start with GGUF since that's the most common for these types of models. Each format we support multiplies development and testing effort, so we need to be strategic about which ones matter most.</p>",
            },
          ],
        },
        {
          html: '<p>Design Memory Management System</p><p>Create system for efficient context handling to allow longer conversations on limited hardware.</p><p>Approach:</p><ul><li>Implement sliding context windows</li><li>Add conversation summarization</li><li>Create memory usage indicators</li><li>Allow user control of context length</li></ul><p>Context length is a fundamental limitation of current models. How we manage it directly affects what users can accomplish.</p>',
          messages: [
            {
              html: '<p>Rob: I think we can implement sliding context windows with summarization for memory efficiency. The challenge is how to summarize without losing critical information - this is an algorithmic problem, not just an implementation detail.</p>',
            },
            {
              html: "<p>Jen: Good idea. We should benchmark different approaches here. There's a tradeoff between keeping full context (memory intensive) and summarizing (lossy but efficient). Users with different hardware will need different defaults.</p>",
            },
          ],
        },
        {
          html: "<p>Implement Tool Use Framework</p><p>Develop system allowing models to call local tools with user permission. Create initial set of basic tools.</p><p>Initial tools:</p><ul><li>Calculator</li><li>Calendar/date functions</li><li>Limited file system access</li><li>Documentation lookup</li></ul><p>This extends the model's capabilities beyond text generation into solving real problems. Each new tool multiplies what users can accomplish.</p>",
          messages: [
            {
              html: '<p>Tom: Need a simple permission system. Each capability should require explicit approval. Unlike cloud systems, we can give much deeper access since everything runs locally, but that power requires careful design.</p>',
            },
            {
              html: '<p>Sarah: We should create a standard interface for these tools. I can draft a spec. The right abstraction here is critical - it determines how easily developers can extend functionality.</p>',
            },
          ],
        },
        {
          html: '<p>Design Security Permissions Model</p><p>Create comprehensive permissions system for file system and network access. Implement UI for managing permissions.</p><p>Requirements:</p><ul><li>Granular permission settings</li><li>Default-deny approach</li><li>Clear permission request UI</li><li>Persistent user preferences</li></ul><p>This is where local-first allows fundamentally better security than cloud alternatives. Users can grant deeper access because they control execution.</p>',
          messages: [
            {
              html: '<p>Rob: Similar to how browsers handle permissions. Default-deny with explicit user grants for specific resources. The key challenge is balancing security with usability - too many prompts and users become desensitized.</p>',
            },
            {
              html: "<p>Jen: I like that approach. Let's use the browser permission UX as inspiration. Users already understand that mental model, which reduces the learning curve.</p>",
            },
          ],
        },
        {
          html: '<p>Add Data Export Functionality</p><p>Implement export options for conversations and data. Support multiple formats for maximum compatibility.</p><p>Format support:</p><ul><li>Plain text</li><li>Markdown</li><li>JSON</li><li>HTML (optional)</li></ul><p>Data portability is essential for a local-first application. Users should never feel locked in, and should own their conversation history completely.</p>',
          messages: [
            {
              html: "<p>Sarah: Should be straightforward. Let's store everything in a simple format from the beginning. If our internal representation is clean, export becomes trivial.</p>",
            },
            {
              html: '<p>Tom: I can take this on. Should we add import functionality too? The ability to move data between instances reinforces our commitment to user ownership.</p>',
            },
          ],
        },
        {
          html: "<p>Design Plugin System</p><p>Create extension architecture for adding functionality. Implement sandbox for plugin execution.</p><p>Technical approach:</p><ul><li>stdin/stdout interface</li><li>Local HTTP for integration</li><li>Permission-based security model</li><li>Plugin discovery and management</li></ul><p>Extensibility determines the long-term value of the platform. We can't anticipate all use cases, so we need to empower users to extend functionality.</p>",
          messages: [
            {
              html: "<p>Rob: Let's look at how Git handles external tools. No need to reinvent the wheel here. Unix-style composition of small tools has proven remarkably robust over decades.</p>",
            },
            {
              html: "<p>Jen: Good reference. VSCode's extension system might be worth looking at too. The challenge is creating a system powerful enough to be useful but constrained enough to be secure.</p>",
            },
          ],
        },
        {
          html: '<p>Implement Prompt Library</p><p>Build functionality to save and manage reusable prompts. Add template variables for customization.</p><p>Features:</p><ul><li>Prompt saving/categorization</li><li>Variable substitution</li><li>Import/export of prompt collections</li><li>Version history</li></ul><p>Good prompts are becoming valuable intellectual property. A library system acknowledges this and helps users build their collection.</p>',
          messages: [
            {
              html: '<p>Tom: Simple text templates should be enough. No need for a visual editor yet. Over-engineering here would delay more important features. Text is flexible and portable.</p>',
            },
            {
              html: "<p>Sarah: Agreed on keeping it simple. Let's add categories for organization though. As users accumulate dozens or hundreds of prompts, organization becomes essential.</p>",
            },
          ],
        },
        {
          html: "<p>Add Token Visualization Tools</p><p>Create debugging feature to show model's step-by-step token generation for educational purposes.</p><p>Requirements:</p><ul><li>Token-by-token display</li><li>Probability visualization</li><li>Performance metrics</li><li>Export of trace data</li></ul><p>This transforms the app from a black box into a learning tool. Understanding how models think helps users write better prompts.</p>",
          messages: [
            {
              html: '<p>Tom: Useful for debugging and teaching how these models actually work. Low priority but interesting. Making the internals visible demystifies AI and empowers users.</p>',
            },
            {
              html: "<p>Rob: Good learning tool. Let's put this on the nice-to-have list for after the MVP. Many users won't care, but those who do will really appreciate the transparency.</p>",
            },
          ],
        },
      ],
    },
    {
      name: 'To Do',
      cards: [
        {
          html: '<p>Create MVP User Interface</p><p>Implement the core UI components for the first version. Focus on minimal, functional design.</p><p>Tasks:</p><ul><li>Build chat interface component</li><li>Create model selection dropdown</li><li>Implement settings panel</li><li>Design conversation history sidebar</li></ul><p>Good UI is invisible - it should get out of the way and let users focus on their conversation with the AI.</p>',
          messages: [
            {
              html: "<p>Sarah: I've finished the wireframes and we're ready to start building. Let's keep it clean and minimal. The best interfaces often feel obvious in retrospect because they align with how users naturally think about the problem.</p>",
            },
            {
              html: "<p>Tom: Looking at the designs now. I can start on the chat interface tomorrow. I want to make sure the token streaming feels natural - it's an important feedback mechanism for local generation.</p>",
            },
          ],
        },
        {
          html: "<p>Implement Model Downloader</p><p>Create functionality to discover, download, and verify AI models from trusted sources.</p><p>Requirements:</p><ul><li>Progress indicators for large downloads</li><li>Checksum verification</li><li>Catalog of compatible models</li><li>Graceful error handling</li></ul><p>This is a critical onboarding step - if users can't easily get models, they'll never experience the rest of the app.</p>",
          messages: [
            {
              html: "<p>Rob: This is a high priority. Users need to get models easily or they'll give up. The gap between installing the app and having a working model should be as small as possible. First impressions matter.</p>",
            },
            {
              html: "<p>Jen: I'll work on the catalog first, then the download functionality. We need to be thoughtful about default recommendations - most users will just use whatever we suggest first.</p>",
            },
          ],
        },
        {
          html: "<p>Build Automated Testing Pipeline</p><p>Set up comprehensive testing framework to ensure reliability as we add features.</p><p>Coverage needed:</p><ul><li>Core inference engine tests</li><li>UI component tests</li><li>End-to-end user flows</li><li>Performance benchmarking</li></ul><p>Tests aren't just about catching bugs - they let us refactor and improve code without fear of regression.</p>",
          messages: [
            {
              html: "<p>Tom: We should set this up now before the codebase gets too complex. Tests written after the fact are always less comprehensive than those written alongside the code they're testing.</p>",
            },
            {
              html: "<p>Sarah: Agreed. I'll create some initial test cases for the components we've already built. Different kinds of tests catch different kinds of problems - we need unit, integration, and end-to-end coverage.</p>",
            },
          ],
        },
      ],
    },
    {
      name: 'In Progress',
      cards: [
        {
          html: '<p>Implement Core Inference Engine</p><p>Building the foundation that will run AI models locally with optimal performance.</p><p>Current tasks:</p><ul><li>Optimizing CPU thread utilization</li><li>Implementing memory management</li><li>Creating token streaming interface</li><li>Supporting context window handling</li></ul><p>This is the heart of the application - everything else depends on having efficient, reliable local inference.</p>',
          messages: [
            {
              html: '<p>Jen: Made a breakthrough on performance! Got token generation up by 30% with better thread management. The key insight was that we were over-parallelizing and creating thread contention. Simpler is sometimes faster.</p>',
            },
            {
              html: "<p>Rob: That's excellent. I'm working on the memory usage monitor now. Should have something to show by tomorrow. We need to give users visibility into resource usage without overwhelming them with technical details.</p>",
            },
            {
              html: "<p>Jen: Just pushed the first working version. Can generate text at about 8 tokens/second on mid-range hardware. That's slower than cloud services but fast enough for interactive use, which validates our core hypothesis.</p>",
            },
          ],
        },
        {
          html: '<p>Design Documentation Site</p><p>Creating comprehensive, user-friendly documentation to help users get started and maximize the potential of the app.</p><p>Progress:</p><ul><li>✓ Site structure defined</li><li>✓ Getting started guide drafted</li><li>⟳ Model compatibility list in progress</li><li>⟳ API documentation started</li></ul><p>Good documentation is a force multiplier - it reduces support burden and empowers users to solve their own problems.</p>',
          messages: [
            {
              html: "<p>Sarah: First draft of the docs site is up at github.io/localai/docs. Very basic but functional. I've organized it around user tasks rather than features, which should make it more intuitive to navigate.</p>",
            },
            {
              html: "<p>Tom: Looking good! I'll add some screenshots and diagrams to make it more visual. Documentation is often overlooked, but it's a crucial part of the user experience, especially for complex tools.</p>",
            },
            {
              html: '<p>Sarah: Just added interactive examples to the API docs. Makes it much clearer how to use the library. The goal is to reduce the time from "I want to do X" to "I know how to do X" as much as possible.</p>',
            },
          ],
        },
        {
          html: '<p>Create Local Storage System</p><p>Implementing secure, efficient storage for conversations, preferences, and model metadata.</p><p>Implementation details:</p><ul><li>Using SQLite with encryption</li><li>Implementing automatic backups</li><li>Creating migration framework for updates</li><li>Building query optimizations for large history</li></ul><p>Storage seems mundane until it fails. A robust storage system is essential for data preservation and user trust.</p>',
          messages: [
            {
              html: "<p>Rob: Database schema v1 is complete. Starting on the conversation storage implementation. I'm trying to design this to be forward-compatible with future features without overcomplicating it now.</p>",
            },
            {
              html: '<p>Jen: Found a potential issue with large conversation history. Working on a fix using paginated queries. As conversations grow, naive approaches start to cause perceptible UI lag.</p>',
            },
            {
              html: "<p>Rob: Good catch. I'm implementing the encryption layer now - should be ready for review by Friday. The encryption has to balance security with performance, as it touches all data operations.</p>",
            },
          ],
        },
      ],
    },
    {
      name: 'Done',
      cards: [
        {
          html: "<p>Project Kickoff Complete</p><p>Successfully launched the LocalAI project with a clear vision and technical direction.</p><p>Accomplishments:</p><ul><li>Defined project scope and mission</li><li>Assembled core team with needed skills</li><li>Created initial technical architecture</li><li>Set up project repository and infrastructure</li></ul><p>A good beginning sets the trajectory for everything that follows. We've established both technical foundations and team alignment.</p>",
          messages: [
            {
              html: '<p>Tom: Great kickoff meeting yesterday! Energy is high and everyone seems aligned on the vision. The distinction between "What are we building?" and "How are we building it?" was particularly helpful.</p>',
            },
            {
              html: "<p>Sarah: The architecture looks solid. Nice balance between ambition and practicality. I like that we're not trying to reinvent everything - leveraging existing libraries where possible but building the core components ourselves.</p>",
            },
            {
              html: "<p>Rob: Thanks all for the input. I've summarized everything in the README. We're officially underway! The clarity we have now will save countless hours of development time later.</p>",
            },
          ],
        },
        {
          html: '<p>Repository Setup Complete</p><p>Established our GitHub presence with all necessary infrastructure for collaboration.</p><p>Completed items:</p><ul><li>Main repository created with clear README</li><li>Contribution guidelines documented</li><li>Issue templates configured</li><li>CI pipeline for basic checks implemented</li><li>Project board created for task tracking</li></ul><p>This foundation makes collaboration possible. Clear processes reduce friction and help everyone contribute effectively.</p>',
          messages: [
            {
              html: "<p>Jen: Everything's set up! Take a look at github.com/localai/core and let me know if anything's missing. I tried to balance thoroughness with simplicity - enough structure to be helpful without becoming bureaucratic.</p>",
            },
            {
              html: '<p>Rob: This is fantastic. Clean, well-organized, and inviting for contributors. The automated checks will save us from many common mistakes before they even reach review.</p>',
            },
            {
              html: '<p>Tom: Just what we needed. The automated checks already caught a build issue I would have missed! Having guardrails in place helps us move faster, not slower.</p>',
            },
          ],
        },
      ],
    },
  ],
};

export const BOARD_ONBOARDING_TEMPLATE = BOARD_DEMO_TEMPLATE;
export const NEW_BOARD_TEMPLATE = BOARD_ONBOARDING_TEMPLATE;
