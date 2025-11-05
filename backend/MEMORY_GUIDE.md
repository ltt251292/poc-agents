# Hướng dẫn Memory trong Mastra

## Tổng quan

Memory trong Mastra giúp agent nhớ lại các tin nhắn trước đó trong cùng một conversation. Trong dự án này, memory đã được cấu hình sẵn và hoạt động tự động.

## Cách hoạt động

### 1. Cấu hình Memory (src/mastra/agents/agent.ts)

```typescript
memory: new Memory({
  storage: new MongoDBStore({
    url: databaseConfig.url,
    dbName: databaseConfig.dbName,
  }),
  options: {
    lastMessages: 20,  // Lấy 20 tin nhắn gần nhất làm context
    threads: {
      generateTitle: true  // Tự động tạo tiêu đề
    }
  }
})
```

### 2. Sử dụng Memory (src/server.ts)

```typescript
const response = await agent.stream(body.message, { 
  memory: {
    thread: body.conversationId,  // ID của conversation
    resource: body.userId          // ID của user
  }
});
```

### 3. Frontend (public/app.js)

```javascript
// Conversation ID được tạo một lần và reuse
function generateConversationId() {
    if (!conversationId) {
        conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return conversationId;
}

// Reset để bắt đầu conversation mới
function clearChat() {
    conversationId = null;  // Reset conversation ID
}
```

## Luồng hoạt động chi tiết

### Lần 1: User gửi tin nhắn đầu tiên
```
1. Frontend tạo conversationId mới (nếu chưa có)
2. Gửi request với:
   - message: "Xin chào"
   - conversationId: "conv-123..."
   - userId: "user-456"
3. Agent nhận tin nhắn, LLM xử lý
4. MongoDB lưu tin nhắn vào thread "conv-123..."
5. LLM trả lời: "Chào bạn!"
6. MongoDB lưu tin nhắn phản hồi
```

### Lần 2: User gửi tin nhắn tiếp theo
```
1. Frontend dùng lại conversationId cũ "conv-123..."
2. Gửi request với:
   - message: "Tên tôi là Nam"
   - conversationId: "conv-123..." (CÙNG ID)
   - userId: "user-456" (CÙNG ID)
3. Agent truy wire ti MongoDB lấy 20 tin nhắn gần nhất từ thread "conv-123..."
4. LLM nhận được context: "Xin chào" → "Chào bạn!"
5. LLM xử lý tin nhắn mới với context này
6. LLM trả lời: "Chào Nam! Rất vui được gặp bạn"
7. MongoDB lưu tin nhắn mới
```

### Lần 3: User hỏi lại
```
1. Conversation ID vẫn là "conv-123..."
2. Gửi request:
   - message: "Tôi tên gì?"
3. Agent lấy 20 tin nhắn gần nhất (có cả "Tên tôi là Nam")
4. LLM trả lời: "Bạn tên là Nam"
```

## Điều chỉnh số lượng tin nhắn nhớ

Nếu muốn agent nhớ nhiều hoặc ít hơn 20 tin nhắn, sửa trong `src/mastra/agents/agent.ts`:

```typescript
memory: new Memory({
  options: {
    lastMessages: 50,  // Thay đổi số này (hiện tại là 20)
  }
})
```

## Kiểm tra Memory có hoạt động

1. Kiểm tra MongoDB có chạy: `mongosh` hoặc MongoDB Compass
2. Xem logs của server khi gửi tin nhắn
3. Thử hỏi agent thông tin từ tin nhắn trước đó

## Lưu ý quan trọng

- ✅ Memory chỉ hoạt động khi dùng **cùng conversationId** và **cùng userId**
- ✅ Khi click "Clear Chat", conversationId được reset → conversation mới không có memory từ conversation cũ
- ✅ Memory được lưu trong MongoDB → ngay cả khi restart server, memory vẫn còn
- ✅ Nếu MongoDB không chạy, memory sẽ không hoạt động

## Troubleshooting

### Agent không nhớ tin nhắn trước đó?

**Kiểm tra:**
1. MongoDB đã chạy chưa?
2. ConversationId có giống nhau giữa các request không?
3. UserId có giống nhau không?
4. Kiểm tra logs của server

**Debug code:**
```typescript
console.log('Conversation ID:', body.conversationId);
console.log('User ID:', body.userId);
```

### Memory bị mất sau khi restart?

- ✅ Memory được lưu trong MongoDB nên sẽ không mất
- ❌ Nếu dùng in-memory database, memory sẽ mất khi restart
- Cấu hình hiện tại dùng MongoDB nên không bị mất

## Tài liệu tham khảo

- [Mastra Memory Documentation](https://mastra.ai/docs/memory/overview)
- [Memory Examples](https://mastra.ai/docs/memory/)

