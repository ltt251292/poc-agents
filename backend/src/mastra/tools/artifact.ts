// src/mastra/tools/artifact-tool.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import logger from "../../logger/index.js";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { CustomerSupportRuntimeContext } from "../agents/agent.js";
import { generateArtifactAgent } from "../agents/artifacts.js";
import { GenerateArtifactRuntimeContext } from "../agents/artifacts.js";
// Định nghĩa các loại artifact
const ArtifactType = z.enum([
  "code",
  "markdown",
  "html",
  "react",
  "svg",
  "mermaid",
  "css",
  "golang"
]);

// Tool để tạo artifact
export const createArtifactTool = createTool({
  id: "create-artifact",
  description: "Tạo một artifact mới (code, document, HTML, React component, SVG, hoặc diagram)",
  inputSchema: z.object({
    userContext: z.string().describe("User context"),
    searchResults: z.string().describe("Search results"),
  }),
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    fileName: z.string(),
    type: z.string(),
    filePath: z.string(),
    description: z.string(),
    content: z.string(),
    message: z.string(),
  }),
  execute: async ({ context: { userContext, searchResults }, runtimeContext }) => {
    try {
      const runtimeContextArtifact = new RuntimeContext<GenerateArtifactRuntimeContext>();
      runtimeContextArtifact.set("model", runtimeContext.get("model") as string);
      runtimeContextArtifact.set("provider", runtimeContext.get("provider") as string);
      const response = await generateArtifactAgent.generate([
        {role: "user", content: userContext},
        {role: "assistant", content: searchResults},
      ], { runtimeContext: runtimeContextArtifact });
      const artifact = JSON.parse(response.text) as {
        title: string;
        nameFile: string;
        type: string;
        language: string;
        content: string;
        description: string;
      };
      logger.info({ nameFile: artifact.nameFile }, "Artifact name file");
      const { title, nameFile, type, language, content, description } = artifact;
      const artifactId = runtimeContext.get("artifactId") as string;
      logger.info({ artifactId }, "Artifact ID");
      const artifactsDir = path.join(process.cwd(), "artifacts");
      
      // Tạo thư mục artifacts nếu chưa tồn tại
      await fs.mkdir(artifactsDir, { recursive: true });
      
      // Xác định extension file
      const extensions: Record<string, string> = {
        code: language ? `.${language}` : ".txt",
        markdown: ".md",
        html: ".html",
        react: ".tsx",
        svg: ".svg",
        mermaid: ".mmd",
        css: ".css",
        golang: ".go",
      };
      
      const extension = extensions[type] || ".txt";
      // Tạo thư mục riêng cho từng artifact để lưu nhiều file nếu cần
      const artifactDir = path.join(artifactsDir, artifactId);
      await fs.mkdir(artifactDir, { recursive: true });
      // File chính mặc định là index.<ext>
      logger.info({ nameFile, extension }, "Main file name");
      const mainFileName = `index${extension}`;
      const filePath = path.join(artifactDir, mainFileName);
      
      // Lưu artifact vào file
      await fs.writeFile(filePath, content, "utf-8");
      
      // Lưu metadata
      const metadata = {
        id: artifactId,
        title: title,
        type: type,
        language: language || "",
        description: description || "",
        createdAt: new Date().toISOString(),
        // Lưu đường dẫn tương đối từ thư mục artifacts để dễ đọc lại
        filePath: path.join(artifactId, mainFileName),
      };
      
      await fs.writeFile(
        path.join(artifactsDir, `${artifactId}.meta.json`),
        JSON.stringify(metadata, null, 2),
        "utf-8"
      );
      logger.info({
        id: artifactId,
        title: title, 
        type: type,
        description: description || "",
        content: content,
        filePath: metadata.filePath,
        message: `Artifact đã được tạo thành công tại ${artifactDir}`,
      }, 'Artifact metadata');
      
      return {
        id: artifactId,
        title: title, 
        type: type,
        fileName: nameFile,
        description: description || "",
        content: content,
        filePath: metadata.filePath,
        message: `Artifact đã được tạo thành công tại ${artifactDir}`,
      };
    } catch (error) {
      logger.error({ error }, "Error generating artifact");
      throw new Error("Error generating artifact");
    }
  },
});

// Tool để cập nhật artifact
export const updateArtifactTool = createTool({
  id: "update-artifact",
  description: "Cập nhật nội dung của một artifact đã tồn tại",
  inputSchema: z.object({
    artifactId: z.string().describe("ID của artifact cần cập nhật"),
    content: z.string().describe("Nội dung mới"),
    oldContent: z.string().optional().describe("Nội dung cũ cần thay thế (để tìm kiếm chính xác)"),
  }),
  outputSchema: z.object({
    id: z.string(),
    message: z.string(),
    updated: z.boolean(),
    content: z.string(),
  }),
  execute: async ({ context }, runtimeContext) => {
    const artifactsDir = path.join(process.cwd(), "artifacts");
    const metaPath = path.join(artifactsDir, `${context.artifactId}.meta.json`);
    
    try {
      // Đọc metadata
      const metaContent = await fs.readFile(metaPath, "utf-8");
      const metadata = JSON.parse(metaContent);
      
      const filePath = path.join(artifactsDir, metadata.filePath);
      
      if (context.oldContent) {
        // Cập nhật một phần nội dung
        const currentContent = await fs.readFile(filePath, "utf-8");
        const newContent = currentContent.replace(context.oldContent, context.content);
        await fs.writeFile(filePath, newContent, "utf-8");
      } else {
        // Ghi đè toàn bộ nội dung
        await fs.writeFile(filePath, context.content, "utf-8");
      }
      
      // Cập nhật metadata
      metadata.updatedAt = new Date().toISOString();
      await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), "utf-8");
      
      return {
        id: context.artifactId,
        message: "Artifact đã được cập nhật thành công",
        updated: true,
        content: context.content,
      };
    } catch (error) {
      return {
        id: context.artifactId,
        message: `Lỗi: ${error instanceof Error ? error.message : "Không thể cập nhật artifact"}`,
        updated: false,
        content: "",
      };
    }
  },
});

// Tool để liệt kê artifacts
export const listArtifactsTool = createTool({
  id: "list-artifacts",
  description: "Liệt kê tất cả artifacts đã tạo",
  inputSchema: z.object({
    type: ArtifactType.optional().describe("Lọc theo loại artifact"),
  }),
  outputSchema: z.object({
    artifacts: z.array(z.any()),
    count: z.number(),
  }),
  execute: async ({ context }) => {
    const artifactsDir = path.join(process.cwd(), "artifacts");
    
    try {
      await fs.mkdir(artifactsDir, { recursive: true });
      const files = await fs.readdir(artifactsDir);
      const metaFiles = files.filter(f => f.endsWith(".meta.json"));
      
      const artifacts = await Promise.all(
        metaFiles.map(async (file) => {
          const content = await fs.readFile(path.join(artifactsDir, file), "utf-8");
          return JSON.parse(content);
        })
      );
      
      const filtered = context.type
        ? artifacts.filter(a => a.type === context.type)
        : artifacts;
      
      return {
        artifacts: filtered,
        count: filtered.length,
      };
    } catch (error) {
      return {
        artifacts: [],
        count: 0,
      };
    }
  },
});

// Tool để xem artifact
export const viewArtifactTool = createTool({
  id: "view-artifact",
  description: "Xem nội dung của một artifact",
  inputSchema: z.object({
    artifactId: z.string().describe("ID của artifact cần xem"),
  }),
  outputSchema: z.object({
    id: z.string(),
    content: z.string(),
    metadata: z.any(),
  }),
  execute: async ({ context }) => {
    const artifactsDir = path.join(process.cwd(), "artifacts");
    const metaPath = path.join(artifactsDir, `${context.artifactId}.meta.json`);
    
    try {
      const metaContent = await fs.readFile(metaPath, "utf-8");
      const metadata = JSON.parse(metaContent);
      
      const filePath = path.join(artifactsDir, metadata.filePath);
      const content = await fs.readFile(filePath, "utf-8");
      
      return {
        id: context.artifactId,
        content,
        metadata,
      };
    } catch (error) {
      throw new Error(`Không tìm thấy artifact với ID: ${context.artifactId}`);
    }
  },
});