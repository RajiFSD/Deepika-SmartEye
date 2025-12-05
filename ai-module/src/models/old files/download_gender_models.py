"""
download_gender_models.py
Downloads OpenCV gender classification model files
"""

import os
import urllib.request
import sys

def download_with_progress(url, filename):
    """Download file with progress indicator"""
    print(f"\n📥 Downloading {filename}...")
    print(f"   URL: {url}")
    
    try:
        def report_progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                percent = min(100, downloaded * 100 / total_size)
                size_mb = total_size / (1024 * 1024)
                downloaded_mb = downloaded / (1024 * 1024)
                bar_length = 40
                filled = int(bar_length * downloaded / total_size)
                bar = '█' * filled + '░' * (bar_length - filled)
                sys.stdout.write(f'\r   [{bar}] {percent:.1f}% ({downloaded_mb:.1f}/{size_mb:.1f} MB)')
                sys.stdout.flush()
        
        urllib.request.urlretrieve(url, filename, reporthook=report_progress)
        print(f"\n✅ Downloaded successfully: {filename}")
        
        # Verify file size
        file_size = os.path.getsize(filename)
        print(f"   File size: {file_size / (1024*1024):.2f} MB")
        return True
        
    except Exception as e:
        print(f"\n❌ Failed to download {filename}")
        print(f"   Error: {e}")
        return False


def main():
    print("="*60)
    print("📦 OpenCV Gender Model Downloader")
    print("="*60)
    
    # Create models directory
    models_dir = "models"
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
        print(f"📁 Created directory: {models_dir}")
    else:
        print(f"📁 Using existing directory: {models_dir}")
    
    # Model URLs (corrected and verified)
    models = {
        "gender_deploy.prototxt": "https://raw.githubusercontent.com/spmallick/learnopencv/master/AgeGender/gender_deploy.prototxt",
        "gender_net.caffemodel": "https://drive.usercontent.google.com/download?id=1W_moLzMlGiELyPxWiYQJ9KFaXroQ_NFQ&export=download&authuser=0&confirm=t"
    }
    
    # Alternative backup URLs
    backup_urls = {
        "gender_net.caffemodel": "https://github.com/GilLevi/AgeGenderDeepLearning/raw/master/models/gender_net.caffemodel"
    }
    
    success_count = 0
    failed_files = []
    
    for filename, url in models.items():
        filepath = os.path.join(models_dir, filename)
        
        # Skip if file already exists
        if os.path.exists(filepath):
            print(f"\n⏭️  {filename} already exists, skipping...")
            success_count += 1
            continue
        
        # Try primary URL
        if download_with_progress(url, filepath):
            success_count += 1
        elif filename in backup_urls:
            # Try backup URL
            print(f"\n🔄 Trying backup URL for {filename}...")
            if download_with_progress(backup_urls[filename], filepath):
                success_count += 1
            else:
                failed_files.append(filename)
        else:
            failed_files.append(filename)
    
    # Summary
    print("\n" + "="*60)
    print("📊 Download Summary")
    print("="*60)
    print(f"✅ Successful: {success_count}/{len(models)}")
    
    if failed_files:
        print(f"❌ Failed: {len(failed_files)}")
        for f in failed_files:
            print(f"   - {f}")
    else:
        print("🎉 All files downloaded successfully!")
        print("\n💡 Next steps:")
        print("   1. The files are in the 'models' directory")
        print("   2. Run your detection service:")
        print("      python detection_service_yolov8_with_tracking.py")
        print("   3. The service will now use OpenCV gender model")
    
    print("="*60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Download cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()