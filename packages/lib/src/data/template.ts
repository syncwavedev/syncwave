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
          html: "<p>Choose Software License</p><p>&nbsp;</p><p>Select appropriate open source license for the project. Document decision rationale.</p><p>&nbsp;</p><p>Options to evaluate:</p><ul><li>MIT: Simple, permissive</li><li>AGPL: Prevents closed forks</li><li>Apache 2.0: Better patent protection</li></ul><p>&nbsp;</p><p>This isn't just a legal formality - it shapes how people can build on our work and whether commercial entities will feel comfortable adopting it.</p>",
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
          html: '<p>Implement Security Measures</p><p>&nbsp;</p><p>Develop and document security model for the application. Create security test suite.</p><p>&nbsp;</p><p>Requirements:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Model source verification</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Input sanitization</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Plugin isolation</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Clear data storage policies</p></div></li></ul><p>&nbsp;</p><p>Security is inherently part of our value proposition - local-first means users don\'t expose their data to third parties. We need to deliver on that promise comprehensively.</p>',
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
          html: '<p>Establish Community Guidelines</p><p>&nbsp;</p><p>Set up project community infrastructure and contribution processes. Create templates and documentation.</p><p>&nbsp;</p><p>Tasks:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Create contribution guide</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Set up issue templates and labels</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Define release process</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Plan communication channels</p></div></li></ul><p>&nbsp;</p><p>Building a healthy community is as important as building good software. Clear processes reduce friction for new contributors.</p>',
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
          html: '<p>Implement Model Swapping Feature</p><p>&nbsp;</p><p>Develop functionality to switch between different locally stored models without restarting the application.</p><p>&nbsp;</p><p>Technical requirements:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Dynamic model loading/unloading</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Memory cleanup on switch</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Model metadata storage</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>UI for model selection</p></div></li></ul><p>&nbsp;</p><p>This is challenging because most ML frameworks aren\'t designed for dynamic loading/unloading. Memory management becomes critical.</p>',
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
          html: '<p>Develop Offline Mode</p><p>&nbsp;</p><p>Ensure application works 100% offline after initial model download. Block all unnecessary network access.</p><p>&nbsp;</p><p>Requirements:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Functional verification without network</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Explicit permission for any data transfer</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Clear UI indicators for online/offline status</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Local-only operations by default</p></div></li></ul><p>&nbsp;</p><p>This isn\'t just a feature but core to our philosophy. A local-first app that quietly calls home undermines its own value proposition.</p>',
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
          html: '<p>Implement Custom Model Support (BYOM)</p><p>&nbsp;</p><p>Add functionality for users to load their own fine-tuned models. Support standard model formats.</p><p>&nbsp;</p><p>Requirements:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Support for GGUF format</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Support for ONNX format</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Basic validation of model files</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Simple import UI</p></div></li></ul><p>&nbsp;</p><p>The ability to use custom models transforms this from a product to a platform. It significantly expands what users can do.</p>',
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
          html: '<p>Design Memory Management System</p><p>&nbsp;</p><p>Create system for efficient context handling to allow longer conversations on limited hardware.</p><p>&nbsp;</p><p>Approach:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Implement sliding context windows</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Add conversation summarization</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Create memory usage indicators</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Allow user control of context length</p></div></li></ul><p>&nbsp;</p><p>Context length is a fundamental limitation of current models. How we manage it directly affects what users can accomplish.</p>',
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
          html: "<p>Implement Tool Use Framework</p><p>&nbsp;</p><p>Develop system allowing models to call local tools with user permission. Create initial set of basic tools.</p><p>&nbsp;</p><p>Initial tools:</p><ul><li>Calculator</li><li>Calendar/date functions</li><li>Limited file system access</li><li>Documentation lookup</li></ul><p>&nbsp;</p><p>This extends the model's capabilities beyond text generation into solving real problems. Each new tool multiplies what users can accomplish.</p>",
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
          html: '<p>Design Security Permissions Model</p><p>&nbsp;</p><p>Create comprehensive permissions system for file system and network access. Implement UI for managing permissions.</p><p>&nbsp;</p><p>Requirements:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Granular permission settings</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Default-deny approach</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Clear permission request UI</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Persistent user preferences</p></div></li></ul><p>&nbsp;</p><p>This is where local-first allows fundamentally better security than cloud alternatives. Users can grant deeper access because they control execution.</p>',
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
          html: '<p>Add Data Export Functionality</p><p>&nbsp;</p><p>Implement export options for conversations and data. Support multiple formats for maximum compatibility.</p><p>&nbsp;</p><p>Format support:</p><ul><li>Plain text</li><li>Markdown</li><li>JSON</li><li>HTML (optional)</li></ul><p>&nbsp;</p><p>Data portability is essential for a local-first application. Users should never feel locked in, and should own their conversation history completely.</p>',
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
          html: "<p>Design Plugin System</p><p>&nbsp;</p><p>Create extension architecture for adding functionality. Implement sandbox for plugin execution.</p><p>&nbsp;</p><p>Technical approach:</p><ul><li>stdin/stdout interface</li><li>Local HTTP for integration</li><li>Permission-based security model</li><li>Plugin discovery and management</li></ul><p>&nbsp;</p><p>Extensibility determines the long-term value of the platform. We can't anticipate all use cases, so we need to empower users to extend functionality.</p>",
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
          html: '<p>Implement Prompt Library</p><p>&nbsp;</p><p>Build functionality to save and manage reusable prompts. Add template variables for customization.</p><p>&nbsp;</p><p>Features:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Prompt saving/categorization</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Variable substitution</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Import/export of prompt collections</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Version history</p></div></li></ul><p>&nbsp;</p><p>Good prompts are becoming valuable intellectual property. A library system acknowledges this and helps users build their collection.</p>',
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
          html: '<p>Add Token Visualization Tools</p><p>&nbsp;</p><p>Create debugging feature to show model\'s step-by-step token generation for educational purposes.</p><p>&nbsp;</p><p>Requirements:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Token-by-token display</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Probability visualization</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Performance metrics</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Export of trace data</p></div></li></ul><p>&nbsp;</p><p>This transforms the app from a black box into a learning tool. Understanding how models think helps users write better prompts.</p>',
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
      name: 'Next Week',
      cards: [
        {
          html: '<p>Define Project Scope: LocalAI</p><p>&nbsp;</p><p>Create initial project definition for our local AI desktop app. Define core requirements and principles that keep user data on their machines instead of remote servers.</p><p>&nbsp;</p><p>Why this matters: Cloud-based AI creates privacy concerns that are fundamentally unsolvable. Running models locally offers an architectural solution rather than a policy band-aid.</p><p>&nbsp;</p><p>Deliverables:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Project requirements doc</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Technical constraints list</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Initial architecture diagram</p></div></li></ul>',
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
          html: '<p>Research Target User Segments</p><p>&nbsp;</p><p>Interview potential users and document primary use cases. Identify priority segments for initial release.</p><p>&nbsp;</p><p>Current findings:</p><ul><li>Developers: Want direct control over models and data</li><li>Content creators: Need AI help without ongoing costs</li><li>Small businesses: Looking for custom workflows with minimal technical overhead</li></ul><p>&nbsp;</p><p>The distinction between these groups matters because it affects our technical decisions. Each has different tolerance for complexity vs. capability.</p>',
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
          html: '<p>Design Initial Technical Architecture</p><p>&nbsp;</p><p>Develop and document the core technical approach. Select initial stack and create architecture diagram.</p><p>&nbsp;</p><p>Current direction:</p><ul><li>Go for backend performance and cross-compilation</li><li>Minimal UI with standard web tech</li><li>Local SQLite for storage</li><li>GGUF format support first</li></ul><p>&nbsp;</p><p>Performance requirement: Keep CPU/memory usage reasonable for average hardware.</p><p>&nbsp;</p><p>These choices represent tradeoffs between development speed, runtime performance, and cross-platform support. Go gives us compiled speed with manageable complexity.</p>',
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
          html: '<p>Define MVP Features</p><p>&nbsp;</p><p>Finalize the feature set for v0.1 release. Create tickets for each feature.</p><p>&nbsp;</p><p>Current proposal:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Text-only interface</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Support for Llama2 7B quantized</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Basic system prompts</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Save/restore conversations</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Memory settings slider</p></div></li></ul><p>&nbsp;</p><p>The goal isn\'t to build everything, but to build enough to test our core thesis: that locally-run AI with user control is valuable enough to overcome performance limitations.</p>',
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
          html: '<p>Design User Interface</p><p>&nbsp;</p><p>Create wireframes and UI specification for the application. Focus on usability and clear information display.</p><p>&nbsp;</p><p>Requirements:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Text input/output interface for v1</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Clear indicator when processing locally</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Memory usage display</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Sensible defaults with advanced settings tucked away</p></div></li></ul><p>&nbsp;</p><p>The UI needs to make the local-first nature of the app evident - users should understand where their data is and what\'s happening with computation resources.</p>',
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
          html: '<p>Implement Local Processing Engine</p><p>&nbsp;</p><p>Develop core processing module for running inference locally. Ensure efficient resource usage and reliability.</p><p>&nbsp;</p><p>Technical requirements:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>No cloud dependencies in core</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Automatic model quantization options</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Streaming generation essential, even if slower</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Thread count settings for different CPUs</p></div></li></ul><p>&nbsp;</p><p>This is the heart of our application. If this doesn\'t work well, nothing else matters. The core challenge is balancing performance with memory usage across diverse hardware.</p>',
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
          html: '<p>Plan Distribution Strategy</p><p>&nbsp;</p><p>Determine how we\'ll package and distribute the application. Create release automation process.</p><p>&nbsp;</p><p>Tasks:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Set up GitHub releases with binaries for major platforms</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Write basic documentation and examples</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Determine license approach (free without artificial limitations)</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Research potential sustainability models</p></div></li></ul><p>&nbsp;</p><p>Distribution matters because installation friction kills adoption. Users should be able to download and start using the app in under 5 minutes.</p>',
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
          html: '<p>Create MVP User Interface</p><p>&nbsp;</p><p>Implement the core UI components for the first version. Focus on minimal, functional design.</p><p>&nbsp;</p><p>Tasks:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Build chat interface component</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Create model selection dropdown</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Implement settings panel</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Design conversation history sidebar</p></div></li></ul><p>&nbsp;</p><p>Good UI is invisible - it should get out of the way and let users focus on their conversation with the AI.</p>',
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
          html: '<p>Implement Model Downloader</p><p>&nbsp;</p><p>Create functionality to discover, download, and verify AI models from trusted sources.</p><p>&nbsp;</p><p>Requirements:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Progress indicators for large downloads</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Checksum verification</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Catalog of compatible models</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Graceful error handling</p></div></li></ul><p>&nbsp;</p><p>This is a critical onboarding step - if users can\'t easily get models, they\'ll never experience the rest of the app.</p>',
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
          html: '<p>Build Automated Testing Pipeline</p><p>&nbsp;</p><p>Set up comprehensive testing framework to ensure reliability as we add features.</p><p>&nbsp;</p><p>Coverage needed:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Core inference engine tests</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>UI component tests</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>End-to-end user flows</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Performance benchmarking</p></div></li></ul><p>&nbsp;</p><p>Tests aren\'t just about catching bugs - they let us refactor and improve code without fear of regression.</p>',
          messages: [
            {
              html: "<p>Tom: We should set this up now before the codebase gets too complex. Tests written after the fact are always less comprehensive than those written alongside the code they're testing.</p>",
            },
            {
              html: "<p>Sarah: Agreed. I'll create some initial test cases for the components we've already built. Different kinds of tests catch different kinds of problems - we need unit, integration, and end-to-end coverage.</p>",
            },
          ],
        },
        {
          html: '<p>Design Privacy-Preserving Analytics</p><p>&nbsp;</p><p>Create optional analytics system that respects user privacy while providing useful development insights.</p><p>&nbsp;</p><p>Requirements:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Make all data collection opt-in only</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Implement local data aggregation before sending</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Create transparent reporting of what\'s collected</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Provide offline submission option</p></div></li></ul><p>&nbsp;</p><p>We need to understand usage patterns to improve the app, but must do so while maintaining our commitment to privacy and local-first principles.</p>',
          messages: [
            {
              html: "<p>Sarah: This is tricky but important. We should show users exactly what data would be sent before they agree. The most privacy-preserving analytics is no analytics, but we'd miss valuable improvement opportunities.</p>",
            },
            {
              html: "<p>Rob: Agreed. Let's design it so data is aggregated locally first, stripping any potentially identifying information. Users should be able to review the exact payload before it's sent. Trust requires transparency.</p>",
            },
          ],
        },
        {
          html: '<p>Optimize Model Performance</p><p>&nbsp;</p><p>Implement advanced optimizations to improve inference speed on consumer hardware. Focus on real-world performance improvements.</p><p>&nbsp;</p><p>Approaches to explore:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Explore SIMD instruction utilization</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Implement adaptive batch sizes</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Research memory access patterns</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Create hardware-specific optimizations</p></div></li></ul><p>&nbsp;</p><p>Performance directly impacts user experience. Every speed improvement expands the practical utility of local AI and makes the tradeoff versus cloud solutions more compelling.</p>',
          messages: [
            {
              html: "<p>Jen: I've been benchmarking some approaches. Early results suggest we can get another 15-20% speedup with better use of SIMD instructions. The challenge is doing this while maintaining compatibility across various CPU architectures.</p>",
            },
            {
              html: "<p>Tom: Let's prioritize optimizations that benefit older hardware the most. Cloud AI has inherent advantages for cutting-edge use cases, but we can win by making AI accessible on hardware people already own.</p>",
            },
          ],
        },
      ],
    },
    {
      name: 'In Progress',
      cards: [
        {
          html: '<p>Implement Core Inference Engine</p><p>&nbsp;</p><p>Building the foundation that will run AI models locally with optimal performance.</p><p>&nbsp;</p><p>Current tasks:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Optimizing CPU thread utilization</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Implementing memory management</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Creating token streaming interface</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Supporting context window handling</p></div></li></ul><p>&nbsp;</p><p>This is the heart of the application - everything else depends on having efficient, reliable local inference.</p>',
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
          html: '<p>Design Documentation Site</p><p>&nbsp;</p><p>Creating comprehensive, user-friendly documentation to help users get started and maximize the potential of the app.</p><p>&nbsp;</p><p>Progress:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Site structure defined</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Getting started guide drafted</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Model compatibility list in progress</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>API documentation started</p></div></li></ul><p>&nbsp;</p><p>Good documentation is a force multiplier - it reduces support burden and empowers users to solve their own problems.</p>',
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
          html: '<p>Create Local Storage System</p><p>&nbsp;</p><p>Implementing secure, efficient storage for conversations, preferences, and model metadata.</p><p>&nbsp;</p><p>Implementation details:</p><ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Using SQLite with encryption</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Implementing automatic backups</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Creating migration framework for updates</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>Building query optimizations for large history</p></div></li></ul><p>&nbsp;</p><p>Storage seems mundane until it fails. A robust storage system is essential for data preservation and user trust.</p>',
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
          html: '<p>Project Kickoff</p><p>&nbsp;</p><p>Launch the LocalAI project with a clear vision and technical direction. Need to get everyone aligned on our goals and approach.</p><p>&nbsp;</p><p>Tasks:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Define project scope and mission</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Assemble core team with needed skills</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Create initial technical architecture</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Set up project repository and infrastructure</p></div></li></ul><p>&nbsp;</p><p>Update: Kickoff complete! We\'ve established both technical foundations and team alignment. A good beginning sets the trajectory for everything that follows.</p>',
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
          html: '<p>Repository Setup</p><p>&nbsp;</p><p>Need to establish our GitHub presence with all necessary infrastructure for collaboration. This will be the foundation of our development process.</p><p>&nbsp;</p><p>Tasks:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Create main repository with clear README</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Document contribution guidelines</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Configure issue templates</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Implement CI pipeline for basic checks</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Create project board for task tracking</p></div></li></ul><p>&nbsp;</p><p>Update: Setup complete! Clear processes reduce friction and help everyone contribute effectively.</p>',
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
        {
          html: '<p>Draft Initial Architecture Decisions</p><p>&nbsp;</p><p>Need to outline key technical decisions and their rationales to guide development. This document will serve as our technical foundation.</p><p>&nbsp;</p><p>Areas to cover:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Select inference engine technology</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Determine storage approach</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Decide on plugin architecture</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Choose primary model format</p></div></li></ul><p>&nbsp;</p><p>Update: Document completed with the following decisions: Go for inference engine (performance, cross-compilation), SQLite for local storage (simplicity, portability), Wasm for plugin architecture (security, isolation), and GGUF as primary model format (community adoption).</p>',
          messages: [
            {
              html: "<p>Rob: Final architecture doc is now in the repo. We won't be dogmatic about these choices, but they give us a solid foundation. The most important principle is that every component must respect the user's ownership of their data and computation.</p>",
            },
            {
              html: "<p>Jen: I especially appreciate how we've documented not just what we decided, but why. The section on memory management trade-offs is particularly good - shows we've thought deeply about the implications of running large models on consumer hardware.</p>",
            },
            {
              html: '<p>Sarah: The most interesting part to me was our conclusion that we should sacrifice some theoretical performance for predictability. Users would rather have consistent 8 tokens/second than occasional bursts of 20 tokens/second intermixed with pauses. Small but stable wins over erratic brilliance in user experience.</p>',
            },
          ],
        },
        {
          html: '<p>Conduct User Research</p><p>&nbsp;</p><p>Interview potential users across different segments to understand needs and validate our approach. Need to get at least 10 responses for meaningful data.</p><p>&nbsp;</p><p>Research goals:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Understand privacy motivations</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Determine acceptable performance tradeoffs</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Identify barriers to adoption</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Discover must-have UI elements</p></div></li></ul><p>&nbsp;</p><p>Update: Completed interviews with 12 potential users! Key findings: Privacy concerns are primary motivator (not just nice-to-have), users accept 30-40% performance reduction for local control, installation complexity is biggest barrier to adoption, and users need clear indicators showing data never leaves device.</p>',
          messages: [
            {
              html: "<p>Tom: The interviews were enlightening. It's not that users don't trust cloud providers at a technical level; they don't trust them at an incentive level. They correctly understand that if data is valuable and someone else has it, incentives inevitably push toward using that data in ways that weren't initially disclosed.</p>",
            },
            {
              html: "<p>Sarah: What struck me was how many users mentioned feeling anxious when typing certain things into cloud AI tools, even when they're not doing anything wrong or sensitive. There's a chilling effect on creativity when you're constantly self-censoring. Local AI removes that psychological barrier.</p>",
            },
            {
              html: "<p>Rob: This confirms our approach. The key insight seems to be that local-first isn't just a technical architecture; it's a realignment of power between users and systems. Users want their tools to be genuinely on their side, with no conflicts of interest or hidden value extraction.</p>",
            },
          ],
        },
        {
          html: '<p>Implement First Model Integration</p><p>&nbsp;</p><p>Create end-to-end integration of a language model running locally. Start with llama2-7b-chat as our first supported model.</p><p>&nbsp;</p><p>Requirements:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Implement model loading/unloading</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Build context management system</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Create token streaming interface</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Add basic prompt template support</p></div></li></ul><p>&nbsp;</p><p>Update: First integration complete! The hardest part wasn\'t the inference itself but ensuring predictable performance across different hardware. We learned that optimizing for consistency is often more important than optimizing for raw speed.</p>',
          messages: [
            {
              html: '<p>Jen: Huge milestone! Had to solve some unexpected memory mapping issues but the core inference pipeline is solid now. It runs consistently on my 5-year-old laptop with about 7 tokens/second, which feels surprisingly usable. The streaming implementation makes it feel responsive even at that rate.</p>',
            },
            {
              html: "<p>Rob: This is the proof-of-concept we needed. There's something qualitatively different about having the model running on your own machine. The latency profile is different from cloud APIs - higher startup cost but more consistent token generation. It just feels different to use.</p>",
            },
            {
              html: "<p>Tom: I'm most impressed by how we solved the context window memory usage. Our approach of dynamically adjusting the reserved memory based on available system resources means we can run on modest hardware by gracefully reducing capabilities instead of crashing. Gradual degradation is better than binary failure.</p>",
            },
          ],
        },
        {
          html: '<p>Create Design Principles</p><p>&nbsp;</p><p>Define core design principles to guide our decision-making throughout the project. Need a shared understanding of our values.</p><p>&nbsp;</p><p>Areas to address:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>User data ownership</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Hardware compatibility approach</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>UI philosophy</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Default behavior principles</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Performance optimization priorities</p></div></li></ul><p>&nbsp;</p><p>Update: Principles established! User data ownership is inviolable, functionality gracefully degrades on limited hardware, transparency trumps abstraction, defaults must be safe but not limiting, and performance optimizes for consistency over peak speed.</p>',
          messages: [
            {
              html: "<p>Sarah: This document might be the most important thing we've created so far. I've worked on projects before where implicit disagreements about fundamentals created friction that was hard to name but impossible to ignore. Being explicit about our values clarifies decisions.</p>",
            },
            {
              html: "<p>Rob: My favorite principle is 'transparency trumps abstraction.' In most software, we hide complexity to make things simpler. But for AI, users actually need to see the machinery to trust it. This inverts much of conventional UI wisdom and will influence every interface decision we make.</p>",
            },
            {
              html: "<p>Tom: I was skeptical about creating this at first - seemed like it might be bureaucratic overhead. But I'm convinced now. Having these principles written down lets us move much faster because we don't have to re-derive our values from first principles every time we face a decision.</p>",
            },
          ],
        },
        {
          html: '<p>Establish Performance Baselines</p><p>&nbsp;</p><p>Run benchmarks across different hardware configurations to understand performance characteristics and set realistic expectations.</p><p>&nbsp;</p><p>Measurements needed:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Token generation speed on different CPUs</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Memory usage patterns under various loads</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Context window scaling behavior</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Model loading time optimizations</p></div></li></ul><p>&nbsp;</p><p>Update: Testing complete! Most interesting discovery: subjective satisfaction depends more on consistency and predictability than raw performance. Users prefer 5 tokens per second reliably over 15 tokens per second with occasional multi-second pauses.</p>',
          messages: [
            {
              html: "<p>Jen: The testing matrix is complete. Most surprising finding: a 6-year-old i5 can run the 7B quantized model at interactive speeds. This dramatically expands our potential user base. We don't need to target power users exclusively; mainstream hardware from the last 5-7 years is sufficient.</p>",
            },
            {
              html: "<p>Rob: It's remarkable how subjective the experience is. In our tests, users consistently preferred slightly slower but visibly smooth token generation over faster but jittery output. There's something deeply unsatisfying about irregular timing that makes the interaction feel broken, even when it's technically faster on average.</p>",
            },
            {
              html: "<p>Tom: I've added detailed metrics to the wiki. The memory optimization was particularly effective. By carefully controlling quantization and context management, we reduced peak memory by almost 40% with only a 15% speed reduction. That's a tradeoff most users with limited RAM will gladly accept.</p>",
            },
          ],
        },
        {
          html: '<p>Test Initial UI Prototype</p><p>&nbsp;</p><p>Conduct usability tests with representative users to validate our interface design before proceeding with full implementation.</p><p>&nbsp;</p><p>Test objectives:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Evaluate chat interface usability</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Test model settings presentation</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Assess local processing indicators</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Gather feedback on resource visibility</p></div></li></ul><p>&nbsp;</p><p>Update: Testing complete with five users! Results: Chat interface was immediately intuitive, model settings need simplification, local processing indicators were well-received, and users want more visibility into resource usage.</p>',
          messages: [
            {
              html: "<p>Sarah: The feedback was incredibly valuable. Users instantly understood the chat interface, but we need to rethink how we present model settings. The current approach overwhelming most users. I'm sketching a simplified version with an 'advanced' toggle to reveal the full complexity.</p>",
            },
            {
              html: "<p>Tom: What struck me was how much users appreciated the little 'processing locally' indicator. It created immediate trust. One user said, 'I feel like I can finally be honest with an AI.' That emotional response is something we should really pay attention to.</p>",
            },
            {
              html: "<p>Rob: There's a fascinating tension between our technical users who want to see and control everything, and mainstream users who want simplicity. But both groups united around wanting to know their data was staying local. Perhaps that's our solution - make the privacy aspects completely transparent while keeping the technical complexity progressive.</p>",
            },
          ],
        },
        {
          html: '<p>Develop Installation Process</p><p>&nbsp;</p><p>Create a streamlined installation experience to minimize friction for new users. Design for multiple platforms with consistent experience.</p><p>&nbsp;</p><p>Requirements:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Create Windows installer package</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Build macOS application bundle</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Package for Linux distributions</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Implement dependency checking</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Add first-run experience</p></div></li></ul><p>&nbsp;</p><p>Update: Installation packages complete for all platforms! Testing showed average setup time under 3 minutes. The first-run wizard guides users through model selection and download, significantly reducing confusion.</p>',
          messages: [
            {
              html: "<p>Jen: Installers for all three platforms are ready. I'm particularly proud of the dependency checker - it elegantly handles edge cases like missing libraries on Linux or security settings on macOS. Installation difficulties are often where we lose non-technical users.</p>",
            },
            {
              html: "<p>Tom: The first-run experience is excellent. It's remarkable how much difference it makes to have the app immediately suggest a small model download rather than presenting users with an empty state and expecting them to figure it out.</p>",
            },
            {
              html: "<p>Rob: Great work! Installation friction was our biggest concern from user research, and this addresses it directly. I especially like how we've made the entire process work offline after the initial download - aligns perfectly with our local-first principles.</p>",
            },
          ],
        },
        {
          html: '<p>Create Resource Monitoring Dashboard</p><p>&nbsp;</p><p>Develop an interface for users to understand and control system resource usage during model operation. Vital for transparency and performance management.</p><p>&nbsp;</p><p>Dashboard elements:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Real-time memory usage visualization</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>CPU utilization tracking</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Batch size adjustment controls</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Thread allocation settings</p></div></li></ul><p>&nbsp;</p><p>Update: Dashboard completed with an elegant, minimal design that conveys vital information without overwhelming users. The visualizations help users understand resource tradeoffs and optimize settings for their specific hardware.</p>',
          messages: [
            {
              html: '<p>Sarah: The resource dashboard is ready! I tried to strike a balance between technical accuracy and visual clarity. Even non-technical users can understand the basic indicators, while power users get detailed metrics if they want them.</p>',
            },
            {
              html: "<p>Jen: This is exactly what we needed. Being transparent about resource usage builds trust - users can see exactly what's happening on their system. The auto-adjust feature that optimizes settings based on available resources is particularly clever.</p>",
            },
            {
              html: "<p>Rob: I've been testing this on various machines, and it's incredibly useful. When the model slows down, users can see why and make informed decisions about adjustments instead of just experiencing unexplained lag. Converting technical metrics into actionable insights is the key innovation here.</p>",
            },
          ],
        },
        {
          html: '<p>Implement Chat History System</p><p>&nbsp;</p><p>Develop functionality to reliably save, search, and restore conversation history. Critical for long-term value and user experience.</p><p>&nbsp;</p><p>Features implemented:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Automatic conversation saving</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Search across all chat history</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Conversation categorization</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Selective deletion options</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Export functionality</p></div></li></ul><p>&nbsp;</p><p>Update: Chat history system complete with robust SQLite backend. The implementation maintains full text search capabilities while keeping queries fast even with thousands of stored conversations.</p>',
          messages: [
            {
              html: "<p>Tom: The chat history system is done! The search function works remarkably well - we're using SQLite FTS for full-text indexing which gives us both speed and relevance ranking. Being able to find past conversations transforms the utility of the app.</p>",
            },
            {
              html: "<p>Rob: I'm impressed with how we've balanced completeness with simplicity. All data is stored locally in standard formats, which reinforces our approach of giving users genuine ownership. The ability to categorize conversations emerged as a crucial organizing principle.</p>",
            },
            {
              html: "<p>Sarah: The export options make me particularly happy. Users can take their conversation history anywhere - as plain text, markdown, JSON, or HTML. It's a small feature but represents our philosophy that users should never be locked in to our specific implementation.</p>",
            },
          ],
        },
        {
          html: '<p>Complete Cross-Platform Testing</p><p>&nbsp;</p><p>Conduct comprehensive testing across all target platforms to ensure consistent behavior and performance. Essential for quality assurance before broader release.</p><p>&nbsp;</p><p>Testing scope:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Verify Windows compatibility (10/11)</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Test on macOS (Intel and Apple Silicon)</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Validate Linux distributions (Ubuntu, Fedora)</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Check different hardware configurations</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Test accessibility compliance</p></div></li></ul><p>&nbsp;</p><p>Update: Testing complete across all platforms! Found and fixed several platform-specific issues. Performance is consistent with expected variations based on hardware capabilities. Accessibility testing revealed improvement areas that have been addressed.</p>',
          messages: [
            {
              html: '<p>Jen: The cross-platform testing is complete. Most interesting finding: Apple Silicon Macs perform exceptionally well, often matching much more expensive hardware. The optimization we did for ARM architectures really paid off.</p>',
            },
            {
              html: '<p>Tom: I was surprised by how well it runs on Linux. The memory management improvements we made for constrained environments have unexpected benefits even on high-end systems - everything just feels more responsive and stable.</p>',
            },
            {
              html: "<p>Sarah: The accessibility testing was eye-opening. We found several issues with screen reader compatibility that weren't obvious to us. The fixes were straightforward once identified, but this reinforces why dedicated testing across different user needs is so important.</p>",
            },
          ],
        },
        {
          html: '<p>Set Up Development Environment</p><p>&nbsp;</p><p>Create standardized development environment to streamline onboarding for new contributors. Documentation and automation are key for maintainable development processes.</p><p>&nbsp;</p><p>Implementation:</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Develop containerized dev environment</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Create comprehensive setup guide</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Configure dev tools and linters</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Set up test data and fixtures</p></div></li><li data-checked="true" data-type="taskItem"><label><input checked="checked" type="checkbox" /></label><div><p>Document coding standards</p></div></li></ul><p>&nbsp;</p><p>Update: Development environment complete with Docker configuration for consistent setup across all platforms. The onboarding documentation enables new contributors to have a working environment in under 15 minutes.</p>',
          messages: [
            {
              html: "<p>Rob: Just finished documenting the development environment. We've created a Docker setup that guarantees consistency regardless of host OS. This solves the 'works on my machine' problem that often plagues cross-platform development.</p>",
            },
            {
              html: '<p>Jen: The containerized approach is excellent. I was able to completely recreate my development environment on a new machine in minutes instead of hours. This will be particularly valuable as we bring in new contributors.</p>',
            },
            {
              html: "<p>Tom: The test fixtures are comprehensive too. Having consistent test data means we're all working against the same baseline, which helps prevent subtle bugs when integrating work from different contributors. It's these foundational elements that often determine a project's long-term success.</p>",
            },
          ],
        },
      ],
    },
  ],
};

export const BOARD_ONBOARDING_TEMPLATE = BOARD_DEMO_TEMPLATE;

export const NEW_BOARD_TEMPLATE = {
  columns: [
    {
      name: 'Backlog',
      cards: [],
    },
    {
      name: 'Next Week',
      cards: [],
    },
    {
      name: 'In Progress',
      cards: [],
    },
    {
      name: 'Done',
      cards: [],
    },
  ],
};
