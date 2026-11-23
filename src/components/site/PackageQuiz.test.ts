import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Execute the existing pure recommendation logic without loading browser services.
const source = readFileSync(new URL("./PackageQuiz.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("PackageQuiz.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = ast.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === "recommend",
);
if (!declaration) throw new Error("Recommendation logic not found");
const { outputText } = ts.transpileModule(declaration.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
});
const recommend = new Function(`${outputText}; return recommend;`)() as (
  answers: Record<string, string>,
) => { key: string; price: number | null };

describe("Netflix-only quiz prices", () => {
  test("Netflix Personal costs K90", () => {
    assert.equal(recommend({ vibe: "series", watching: "solo", budget: "value" }).price, 90);
  });
  test("Netflix Lite costs K40", () => {
    assert.equal(recommend({ vibe: "series", watching: "solo", budget: "light" }).price, 40);
  });
  test("Prime Video is never recommended", () => {
    for (const vibe of ["series", "originals", "trending"])
      for (const budget of ["light", "value", "premium"])
        assert.ok(["netflix", "lite"].includes(recommend({ vibe, watching: "couple", budget }).key));
  });
});
