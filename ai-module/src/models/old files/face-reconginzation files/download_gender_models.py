import os
import urllib.request
import ssl

# Bypass SSL verification (for some corporate networks)
ssl._create_default_https_context = ssl._create_unverified_context

def download_file(url, filepath):
    """Download file with progress tracking"""
    try:
        print(f"📥 Downloading {os.path.basename(filepath)}...")
        urllib.request.urlretrieve(url, filepath)
        print(f"✅ Successfully downloaded: {filepath}")
        return True
    except Exception as e:
        print(f"❌ Failed to download {url}: {e}")
        return False

def main():
    # Create models directory
    models_dir = "models"
    os.makedirs(models_dir, exist_ok=True)
    
    # Alternative sources for gender models
    gender_sources = [
        {
            'prototxt': 'https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt',
            'caffemodel': 'https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel'
        },
        {
            'prototxt': 'https://github.com/arunponnusamy/cvlib/raw/master/cvlib/data/gender_deploy.prototxt',
            'caffemodel': 'https://github.com/arunponnusamy/cvlib/raw/master/cvlib/data/gender_net.caffemodel'
        }
    ]
    
    # Try multiple sources
    success = False
    for source in gender_sources:
        prototxt_path = os.path.join(models_dir, 'gender_deploy.prototxt')
        caffemodel_path = os.path.join(models_dir, 'gender_net.caffemodel')
        
        print(f"🔧 Trying source: {source['prototxt']}")
        
        if download_file(source['prototxt'], prototxt_path) and download_file(source['caffemodel'], caffemodel_path):
            success = True
            break
        else:
            print("⚠️ This source failed, trying next...")
    
    if success:
        print("\n🎉 All gender model files downloaded successfully!")
        print(f"📁 Location: {os.path.abspath(models_dir)}")
        
        # Verify file sizes
        prototxt_size = os.path.getsize(os.path.join(models_dir, 'gender_deploy.prototxt'))
        caffemodel_size = os.path.getsize(os.path.join(models_dir, 'gender_net.caffemodel'))
        
        print(f"📊 File sizes: prototxt={prototxt_size} bytes, caffemodel={caffemodel_size} bytes")
    else:
        print("\n❌ All download sources failed. Trying manual download...")
        manual_download_instructions()

def manual_download_instructions():
    """Provide manual download instructions"""
    print("\n📋 MANUAL DOWNLOAD INSTRUCTIONS:")
    print("1. Visit: https://drive.google.com/drive/folders/1Z1RqRo0_JiavaTx2m1eE7t24a3vBBGjx")
    print("2. Download both files:")
    print("   - gender_deploy.prototxt")
    print("   - gender_net.caffemodel")
    print("3. Place them in the 'models' folder")
    print("4. Run the detection script again")

if __name__ == "__main__":
    main()  