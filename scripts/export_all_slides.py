import os
import sys
import json
import win32com.client
from pptx import Presentation
import pypdfium2 as pdfium
import pypdf

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    slides_dir = os.path.join(root, "slides_img")
    os.makedirs(slides_dir, exist_ok=True)

    pptx_files = [
        ("01_Google Flow 工作流程.pptx", "Google Flow 工作流程篇"),
        ("02_Google Flow 安裝.pptx", "Google Flow 安裝設定篇"),
        ("03_創建虛擬形象個人分身.pptx", "創建虛擬形象個人分身篇"),
        ("04_主角固定人物和聲音.pptx", "主角固定人物與聲音篇"),
    ]

    all_slides = []
    global_idx = 1

    print("[1/3] 開始讀取 PPTX 內容並匯出高解析投影片影像...")
    ppt_app = win32com.client.Dispatch("PowerPoint.Application")

    for filename, category in pptx_files:
        pptx_path = os.path.abspath(filename)
        if not os.path.exists(pptx_path):
            print(f"找不到檔案: {filename}")
            continue

        prs = Presentation(pptx_path)
        ppt_pres = ppt_app.Presentations.Open(pptx_path, True, False, False)
        count = ppt_pres.Slides.Count

        for i in range(1, count + 1):
            out_img_name = f"slide_{global_idx:03d}.png"
            out_img_path = os.path.abspath(os.path.join(slides_dir, out_img_name))
            
            # Export via PowerPoint COM (1920x1080)
            ppt_pres.Slides(i).Export(out_img_path, "PNG", 1920, 1080)

            # Extract slide text & notes from python-pptx
            slide_obj = prs.slides[i - 1]
            texts = []
            for shape in slide_obj.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        t = paragraph.text.strip()
                        if t and t not in texts:
                            texts.append(t)
            
            notes = ""
            if slide_obj.has_notes_slide and slide_obj.notes_slide.notes_text_frame:
                notes = slide_obj.notes_slide.notes_text_frame.text.strip()

            title = texts[0] if texts else f"{category} - 第 {i} 頁"
            if len(title) > 40:
                title = title[:40] + "..."

            content_text = " | ".join(texts) if texts else title

            all_slides.append({
                "slide_num": global_idx,
                "orig_num": i,
                "source": filename,
                "category": category,
                "title": title,
                "image": f"slides_img/{out_img_name}",
                "notes": notes if notes else f"【{title}】核心要點說明：{content_text[:120]}...",
                "content": content_text
            })
            global_idx += 1

        ppt_pres.Close()
        print(f"  已完成 {filename} 匯出 ({count} 頁)")

    ppt_app.Quit()

    # [2/3] Render 07_剪映 AI 影片後製.pdf
    pdf_path = os.path.abspath("07_剪映 AI 影片後製.pdf")
    if os.path.exists(pdf_path):
        print("[2/3] 渲染 07_剪映 AI 影片後製.pdf 頁面至 slides_img/ ...")
        pdf_reader = pypdf.PdfReader(pdf_path)
        pdf = pdfium.PdfDocument(pdf_path)
        pdf_count = len(pdf)
        
        for i in range(pdf_count):
            out_img_name = f"slide_{global_idx:03d}.png"
            out_img_path = os.path.abspath(os.path.join(slides_dir, out_img_name))
            
            # Render page via pypdfium2
            page = pdf[i]
            # scale=1.33 gives approx 1920x1080 for standard 16:9 PDF
            image = page.render(scale=1.5).to_pil()
            image.save(out_img_path, "PNG")

            txt = ""
            try:
                txt = pdf_reader.pages[i].extract_text() or ""
            except Exception:
                pass
            lines = [l.strip() for l in txt.splitlines() if l.strip()]
            title = lines[0] if lines else f"剪映 AI 影片後製 - 第 {i+1} 頁"
            if len(title) > 40:
                title = title[:40] + "..."
            content_text = " | ".join(lines) if lines else title

            all_slides.append({
                "slide_num": global_idx,
                "orig_num": i + 1,
                "source": "07_剪映 AI 影片後製.pdf",
                "category": "剪映 AI 影片後製篇",
                "title": title,
                "image": f"slides_img/{out_img_name}",
                "notes": f"【剪映 AI 影片後製 - 第 {i+1} 頁】{content_text[:150]}",
                "content": content_text
            })
            global_idx += 1

        print(f"  已完成 07_剪映 AI 影片後製.pdf 渲染 ({pdf_count} 頁)")

    print(f"[3/3] 產生 slides_data.json 與 slides_data.js，總計 {len(all_slides)} 頁...")
    with open("slides_data.json", "w", encoding="utf-8") as f:
        json.dump(all_slides, f, ensure_ascii=False, indent=2)

    with open("slides_data.js", "w", encoding="utf-8") as f:
        f.write("/**\n * 呂聰賢老師 AI歷史劇創作研習 全系列投影片資料庫\n */\n")
        f.write("window.SLIDES_DATA = " + json.dumps(all_slides, ensure_ascii=False, indent=2) + ";\n")

    print(f"🎉 全部 107 頁投影片匯出與資料生成成功！")

if __name__ == "__main__":
    main()
