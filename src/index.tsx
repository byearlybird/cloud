import { Hono } from "hono";
import type { FC } from "hono/jsx";

const app = new Hono();

app.use("*", async (c, next) => {
	c.setRenderer((content) => {
		return c.html(
			<html lang="en">
				<head>
					<meta charset="UTF-8" />
					<meta
						name="viewport"
						content="width=device-width, initial-scale=1.0"
					/>
					<title>Starling Server</title>
					<link
						rel="stylesheet"
						href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
					></link>
				</head>
				<body>{content}</body>
			</html>,
		);
	});
	await next();
});

const Top: FC<{ messages: string[] }> = (props: { messages: string[] }) => {
	return (
		<main class="container">
			<h1>Hello Hono?</h1>
			<ul>
				{props.messages.map((message) => {
					return <li>{message}!!</li>;
				})}
			</ul>
		</main>
	);
};

app.get("/", (c) => {
	const messages = ["Good Morning", "Good Evening", "Good Night"];
	return c.render(<Top messages={messages} />);
});

export default app;
