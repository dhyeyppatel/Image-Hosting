from flask import Flask, request, jsonify
import requests
import os
import base64

app = Flask(__name__)

# Environment variables
TG_BOT_TOKEN = os.environ.get('TG_BOT_TOKEN', '').strip()
CF_DOMAIN = os.environ.get('CF_DOMAIN', '').strip()
CF_USERNAME = os.environ.get('CF_USERNAME', 'admin').strip()
CF_PASSWORD = os.environ.get('CF_PASSWORD', 'dhyey').strip()
TG_CHAT_ID = os.environ.get('TG_CHAT_ID', '').strip()

@app.route('/', methods=['GET'])
def index():
    return "Bot is running"

@app.route('/webhook', methods=['POST'])
def webhook():
    update = request.get_json()
    if not update or "message" not in update:
        return "OK", 200

    message = update["message"]
    chat_id = message["chat"]["id"]
    
    # We only care about media types (photos, videos, documents, audio)
    file_id = None
    file_name = None
    media_type = "unknown"
    file_extension = "bin"

    if "photo" in message:
        photo = message["photo"][-1]
        file_id = photo["file_id"]
        file_name = "photo.jpg"
        media_type = "image/jpeg"
        file_extension = "jpg"
    elif "document" in message:
        doc = message["document"]
        file_id = doc["file_id"]
        file_name = doc.get("file_name", "document")
        media_type = doc.get("mime_type", "application/octet-stream")
        if "." in file_name:
            file_extension = file_name.split(".")[-1]
    elif "video" in message:
        vid = message["video"]
        file_id = vid["file_id"]
        file_name = vid.get("file_name", "video.mp4")
        media_type = vid.get("mime_type", "video/mp4")
        if "." in file_name:
            file_extension = file_name.split(".")[-1]
    elif "audio" in message:
        aud = message["audio"]
        file_id = aud["file_id"]
        file_name = aud.get("file_name", "audio.mp3")
        media_type = aud.get("mime_type", "audio/mpeg")
        if "." in file_name:
            file_extension = file_name.split(".")[-1]

    if not file_id:
        # Ignore text messages or send a help message
        if "text" in message and message["text"] == "/start":
            send_message(chat_id, "Welcome to CommonThread Media Host!\n\nSend me any photo, video, or document and I will instantly upload it and give you a direct hosting link.")
        return "OK", 200

    # We need to ensure the file is also sent to the admin channel (TG_CHAT_ID)
    if TG_CHAT_ID:
        try:
            forward_res = requests.post(f"https://api.telegram.org/bot{TG_BOT_TOKEN}/forwardMessage", json={
                "chat_id": TG_CHAT_ID,
                "from_chat_id": chat_id,
                "message_id": message["message_id"]
            })
            forward_data = forward_res.json()
        except Exception:
            pass
            
    # Send processing message
    processing_msg = send_message(chat_id, "Processing your upload...")

    # Now we call our Cloudflare Worker API to register the file_id
    cf_url = f"https://{CF_DOMAIN}/api/register"
    auth_str = f"{CF_USERNAME}:{CF_PASSWORD}"
    encoded_auth = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {encoded_auth}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "fileId": file_id,
        "originalFileName": file_name,
        "fileExtension": file_extension,
        "mediaType": media_type
    }
    
    try:
        res = requests.post(cf_url, json=payload, headers=headers)
        if res.status_code == 200:
            data = res.json()
            hosted_url = data.get("url")
            # Reply to user
            text = f"✅ **Upload Successful!**\n\n🔗 [Direct Link]({hosted_url})\n\n`{hosted_url}`"
            send_message(chat_id, text, reply_to_message_id=message["message_id"])
        else:
            send_message(chat_id, f"❌ Cloudflare Error: {res.text}")
    except Exception as e:
        send_message(chat_id, f"❌ Bot Error: {str(e)}")
        
    # Delete processing message if needed
    if processing_msg:
        try:
            msg_id = processing_msg["result"]["message_id"]
            requests.post(f"https://api.telegram.org/bot{TG_BOT_TOKEN}/deleteMessage", json={
                "chat_id": chat_id,
                "message_id": msg_id
            })
        except:
            pass

    return "OK", 200

def send_message(chat_id, text, reply_to_message_id=None):
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True
    }
    if reply_to_message_id:
        payload["reply_to_message_id"] = reply_to_message_id
        
    try:
        res = requests.post(f"https://api.telegram.org/bot{TG_BOT_TOKEN}/sendMessage", json=payload)
        return res.json()
    except:
        return None

if __name__ == "__main__":
    app.run(port=5000)
