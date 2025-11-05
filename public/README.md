# AI Agent Chat - React Frontend

Ứng dụng chat AI Agent được xây dựng bằng React và Vite.

## Cài đặt

```bash
cd public
npm install
```

## Cấu hình Environment Variables

Tạo file `.env` trong thư mục `public/` với nội dung:

```env
VITE_API_HOST=http://localhost:5000
VITE_API_PATH=/api/agent/chat
```

**Lưu ý:** Trong Vite, các biến môi trường phải bắt đầu với `VITE_` để được expose ra client-side.

## Chạy ứng dụng

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

## Build cho production

```bash
npm run build
```

Files build sẽ được tạo trong thư mục `dist/`

## Cấu trúc dự án

```
src/
├── components/          # React components
│   ├── Sidebar.jsx      # Sidebar cấu hình
│   ├── ChatMessages.jsx # Hiển thị tin nhắn
│   ├── ChatInput.jsx    # Form nhập tin nhắn
│   └── AttachmentsPanel.jsx # Panel hiển thị search results
├── hooks/
│   └── useChat.jsx      # Custom hook quản lý chat logic
├── App.jsx              # Main app component
├── main.jsx             # Entry point
└── style.css            # Styles
```

## Tính năng

- Chat với AI Agent với streaming response
- Cấu hình agent (model, provider, API key, instructions)
- Hiển thị search results từ serper tool
- Markdown parsing cho tin nhắn
- Responsive design

