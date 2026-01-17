#!/usr/bin/env python3
"""
開発用ホットリロードサーバー
WebSocketを使用してファイル変更を監視し、自動的にブラウザをリロードします
"""

import http.server
import socketserver
import os
import threading
import asyncio
import json
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import websockets

PORT = 8000
WS_PORT = 8001

# WebSocket接続を管理するセット
websocket_clients = set()

RELOAD_SCRIPT = """
<script>
(function() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:8001`);
    
    ws.onopen = function() {
        console.log('[ホットリロード] WebSocket接続を確立しました');
    };
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'reload') {
            console.log('[ホットリロード] ファイル変更を検知、リロードします...');
            window.location.reload();
        }
    };
    
    ws.onerror = function(error) {
        console.error('[ホットリロード] WebSocketエラー:', error);
    };
    
    ws.onclose = function() {
        console.log('[ホットリロード] WebSocket接続が閉じられました');
    };
})();
</script>
"""

class ReloadHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.endswith('.html'):
            self.send_header('Content-Type', 'text/html; charset=utf-8')
        super().end_headers()
    
    def do_GET(self):
        if self.path.endswith('.html'):
            file_path = self.path.lstrip('/')
            if file_path == '':
                file_path = 'index.html'
            
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    content = f.read()
                    # HTMLの</body>タグの前にリロードスクリプトを挿入
                    content_str = content.decode('utf-8', errors='ignore')
                    if '</body>' in content_str:
                        content_str = content_str.replace('</body>', RELOAD_SCRIPT + '</body>')
                    else:
                        content_str += RELOAD_SCRIPT
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(content_str.encode('utf-8'))
                    return
        
        super().do_GET()
    
    def log_message(self, format, *args):
        pass

class FileChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if not event.is_directory:
            # .pyファイルの変更は無視（サーバー自体の変更）
            if not event.src_path.endswith('.py'):
                print(f'[変更検知] {event.src_path}')
                # WebSocket経由で全クライアントに通知
                asyncio.run_coroutine_threadsafe(
                    notify_clients(),
                    ws_loop
                )

async def notify_clients():
    """接続されている全クライアントにリロード通知を送信"""
    if websocket_clients:
        message = json.dumps({'type': 'reload'})
        disconnected = set()
        for ws in websocket_clients:
            try:
                await ws.send(message)
            except:
                disconnected.add(ws)
        websocket_clients.difference_update(disconnected)

async def websocket_handler(websocket, path):
    """WebSocket接続のハンドラー"""
    websocket_clients.add(websocket)
    print(f'[WebSocket] クライアント接続 (総数: {len(websocket_clients)})')
    try:
        await websocket.wait_closed()
    finally:
        websocket_clients.discard(websocket)
        print(f'[WebSocket] クライアント切断 (総数: {len(websocket_clients)})')

async def start_websocket_server():
    """WebSocketサーバーを起動"""
    async with websockets.serve(websocket_handler, "localhost", WS_PORT):
        print(f'WebSocketサーバーを起動しました: ws://localhost:{WS_PORT}')
        await asyncio.Future()  # 永久に実行

def run_websocket_server():
    """WebSocketサーバーを別スレッドで実行"""
    global ws_loop
    ws_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(ws_loop)
    ws_loop.run_until_complete(start_websocket_server())

def main():
    os.chdir(Path(__file__).parent)
    
    # WebSocketサーバーを別スレッドで起動
    ws_thread = threading.Thread(target=run_websocket_server, daemon=True)
    ws_thread.start()
    
    # HTTPサーバーを起動
    handler = ReloadHandler
    httpd = socketserver.TCPServer(("", PORT), handler)
    
    # ファイル監視の設定
    event_handler = FileChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, path='.', recursive=False)
    observer.start()
    
    print(f'開発サーバーを起動しました: http://localhost:{PORT}')
    print('ファイル変更を監視中... (Ctrl+Cで終了)')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nサーバーを停止します...')
        observer.stop()
        httpd.shutdown()
    
    observer.join()

if __name__ == '__main__':
    main()