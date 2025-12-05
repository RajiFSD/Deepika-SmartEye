import urllib.request

urls = {
    "res10_300x300_ssd_iter_140000_fp16.caffemodel": 
        "https://storage.googleapis.com/opencv-rn-models/res10_300x300_ssd_iter_140000_fp16.caffemodel",

    "deploy_gender.prototxt": 
        "https://storage.googleapis.com/opencv-rn-models/deploy_gender.prototxt",

    "gender_net.caffemodel": 
        "https://storage.googleapis.com/opencv-rn-models/gender_net.caffemodel"
}

for filename, url in urls.items():
    print("Downloading", filename)
    urllib.request.urlretrieve(url, filename)