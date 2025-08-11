# Oasis - the AI operating system

## Inspiration

The way we interact with computers hasn’t fundamentally changed in decades. Humans still click, type, and tap through a graphical interface, while AI agents—if they can interact at all—are usually stuck in chat windows, limited to isolated APIs or brittle computer use agents.
We asked ourselves: **What if AI agents could use your computer as seamlessly as you do?**
The answer is Oasis — a new kind of agentic operating system. In Oasis, humans interact with the OS through a rich, native UI, while AI agents operate through a direct MCP (Model Context Protocol) interface to the same underlying tools. Both layers are always in perfect sync, meaning you and your agents are truly sharing the same workspace in real time.

## What it does
Oasis is two layers on one foundation:
	1.	The Human Layer — A complete, native desktop environment with apps like Mail, Calendar, File System, Terminal, and Slack. Everything feels familiar: you click, drag, type, and navigate as you would on macOS or Windows.
	2.	The Agent Layer — A set of MCP tools exposing the full functionality of each app. Agents can query, read, write, search, and execute commands directly, without “pretending” to be human or scraping the UI.

Because both layers use the same MCP backbone, any action in one is instantly visible in the other:
	-	You drag an email into a folder → your agent instantly knows it’s been filed.
	-	Your agent schedules a meeting → it appears in your calendar immediately.
	-	You rename a file in the UI → your agent’s next command reflects the new name.

It’s not an AI add-on. It’s an OS designed from the ground up for humans and agents to coexist.

## How we built it
	-	MCP Backbone — Every app in Oasis is implemented as a set of MCP tools. The UI is just a client of MCP, same as the agents. This guarantees shared context and eliminates drift between human and AI actions.
	-	Dual-Layer Architecture — Human-facing UI components are built on top of the same commands and APIs that agents use, so there’s no duplicated logic.
	-	Agent-Native Apps — We designed built-in apps—Mail, Terminal, File System, Calendar, Slack—to be first-class citizens for both humans and agents. Adding a new app means adding MCP tools; the UI and agent capabilities update in lockstep.
	-	Real-Time Sync — A shared state manager propagates every action to both layers instantly, ensuring no conflicts and no stale data.

## What’s next for Oasis — The AI Operating System

Our long-term vision is a world where every operating system and every app is built like Oasis—with a human UI and an agent API sitting on the same foundation, always in sync. That means:
	-	Any app you install is instantly usable by you and your agents.
	-	Agents from anywhere in the MCP ecosystem can plug in and work side-by-side with you.
	-	Work is no longer a linear, human-only process—it’s a parallel, human+AI collaboration.

Next steps:
	-	Expand the app library — Add more MCP-powered apps, from spreadsheets to design tools.
	-	Third-party developer SDK — Let anyone build Oasis-native apps once, for both humans and agents.
	-	Collaborative workspaces — Allow multiple humans and agents to work together in real time, across multiple Oasis instances.
	-	OS-level adoption — Partner with OS vendors to bring this architecture to mainstream desktops.

The future we see is simple: an operating system where you and your agents are equal citizens. Oasis is the first step toward making that future real.


