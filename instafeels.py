import re
import os
import io
import uuid
import urllib.request
from collections import Counter
from google.cloud.vision import types
from google.cloud import vision
from google.oauth2 import service_account

creds = service_account.Credentials.from_service_account_file('./gcp_keyfile.json')

def main():
    print("main called")

    myuuid = uuid.uuid4().hex
    os.makedirs('./{0}'.format(myuuid))
    print('run guid: {0}'.format(myuuid))

    # REQUEST A INSTAG
    tag = 'glasses'
    contents = urllib.request.urlopen("https://www.instagram.com/explore/tags/{0}/".format(tag)).read().decode('utf-8')

    # EXTRAER URLs
    preurls = re.findall('https?://(?:[-\w./])+', contents)
    urls = []

    ## QUITAR URLs NO VALIDAS
    lastId = ''
    for url in preurls:
        #if con magia negra para quitar las url que no son fotos o son fotos repes
        if 'x' not in url and url.endswith('jpg') and len(url) < 160:
            #ultima comprobacion para fotos repes
            spliturl = url.split("_")
            currId = spliturl[len(spliturl)-2]
            if currId != lastId:
                #es foto original, la guardo para analizar
                urls.append(url)
                print('Approved: {0}'.format(url))

            lastId = currId

    #MANDAR A GCP
    vision_client = vision.ImageAnnotatorClient(credentials=creds)
    themes = []

    for i in range(0, 15):
        temp_file = '{0}/{1}.jpg'.format(myuuid, i)
        currenturl = urls[i]
        urllib.request.urlretrieve(currenturl, temp_file)

        with io.open(temp_file, 'rb') as image_file:
            content = image_file.read()

        img = types.Image(content=content)
        response = vision_client.label_detection(image=img)

        labels = response.label_annotations

        print('img :{0}'.format(currenturl))
        for label in labels:
            themes.append(label.description)

    print('People who tag their pictures with {0} photograph mostly these things: {1}'.format(tag, Counter(themes).most_common(5)))

    print("main finished")


if __name__ == "__main__":
    main()
