import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FormattedChatMessage from "./FormattedChatMessage";
it("links catalogue facts while keeping external scripts and markup inert", () => {
  const html = renderToStaticMarkup(
    <FormattedChatMessage
      content={
        "[Mazoe](/shop/products?product=mazoe-orange)\n\n[x](javascript:alert(1)) <script>bad</script>"
      }
    />
  );
  expect(html).toContain('href="/shop/products?product=mazoe-orange"');
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});

it("links known AR and travel routes but never protocol-relative or unknown destinations", () => {
  const html = renderToStaticMarkup(
    <FormattedChatMessage
      content={
        "[AR](/onesa-ai-tourism-augmented-experience) [evil](//evil.test) [unknown](/admin?access=secret)"
      }
    />
  );
  expect(html).toContain('href="/travel/augmented-experience"');
  expect(html).not.toContain('href="//');
  expect(html).not.toContain('href="/admin');
});
