---
title: 'Using MinIO with Django for local development'
description: "The development process of modern applications can bring us to the moment when our local environment is slightly different from the cloud version. This can result in the need to test applications both locally and after deployment. In this article, I'll introduce a solution that allows you to easily replicate AWS S3 bucket functionality within your local setup."
pubDate: 'May 13 2022'
---

The development process of modern applications can bring us to the moment when our local environment is slightly different from the cloud version. This can result in the need to test applications both locally and after deployment. In this article, I'll introduce a solution that allows you to easily replicate AWS S3 bucket functionality within your local setup.

For this article's purposes, I created a simple blog application that will store statics and uploaded files to the S3 bucket.

#### What is MinIO?
MinIO is a service that provides S3 object storage. MinIO allows us to create multiple buckets, upload files using AWS API and browse them using a friendly-looking dashboard.

From the developers' perspective, we can avoid creating multiple configurations for different environments and make application deployment much smoother — we can test S3 communication and features during development.

For more details, head over to https://min.io/. Below are a few screenshots from the MinIO dashboard.

#### Docker configuration
To use MinIO we need to configure two additional containers in our docker-compose:

- minio — the main container that will simulate your S3 service
- minio-client — the additional container that will create your buckets automatically

```yaml
volumes:
  minio-data:
minio:
  image: minio/minio:latest
  ports:
  - 9000:9000
  - 9001:9001
  environment:
    MINIO_ACCESS_KEY: minio
    MINIO_SECRET_KEY: minio123
  command: server /data --console-address ":9001"
  volumes:
  - minio-data:/data
minio-client:
  image: minio/mc:latest
  entrypoint: >
    /bin/sh -c "
    /usr/bin/mc config host rm expo;
    /usr/bin/mc config host add --quiet --api s3v4 local http://minio:9000 minio minio123;
    /usr/bin/mc rb --force local/<your-bucket-name>/;
    /usr/bin/mc mb --quiet local/<your-bucket-name>/;
    /usr/bin/mc policy set public local/<your-bucket-name>;
    "
  depends_on:
    - minio
```


The above configuration is prepared to create a single server running on port 9000. The client will automatically create a single bucket.

Said configuration uses volumes to keep your objects persistent. If you want to clear your bucket after stopping your containers, remove volumes from minio container configuration.

#### Django configuration
##### Custom storage
Default S3Boto Storage requires some additional changes to work with our setup. Since we’re working with Docker inside the Docker network, the MinIO container is accessible on minio:9000, but outside of the network, we can access MinIO on localhost:9000. To handle returning the proper paths through to the browsers we need to set up a custom domain for our storage.

```python
class StaticS3Boto3Storage(S3Boto3Storage):
    location = settings.STATICFILES_LOCATION

    def __init__(self, *args, **kwargs):
        if settings.MINIO_ACCESS_URL:
            self.secure_urls = False
            self.custom_domain = settings.MINIO_ACCESS_URL
        super(StaticS3Boto3Storage, self).__init__(*args, **kwargs)


class S3MediaStorage(S3Boto3Storage):
    def __init__(self, *args, **kwargs):
        if settings.MINIO_ACCESS_URL:
            self.secure_urls = False
            self.custom_domain = settings.MINIO_ACCESS_URL
        super(S3MediaStorage, self).__init__(*args, **kwargs)
```

##### Settings file
In Django, we need to use a default configuration for using S3. Remember to use custom storage from the previous step.

settings.py
```python
STATIC_URL = '/static/'
STATICFILES_LOCATION = 'static'
STATICFILES_STORAGE = "blogs.storage.StaticS3Boto3Storage"

MEDIA_URL = '/media/'
DEFAULT_FILE_STORAGE = "blogs.storage.S3MediaStorage"

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")

AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_URL")
MINIO_ACCESS_URL = os.getenv("MINIO_ACCESS_URL")
```

.env
```
AWS_ACCESS_KEY_ID=minio
AWS_SECRET_ACCESS_KEY=minio123
AWS_STORAGE_BUCKET_NAME=<your-bucket-name>
AWS_S3_URL=http://minio:9000
MINIO_ACCESS_URL=localhost:9000/<your-bucket-name>
```

#### Summary
This article presents the most common usage of MinIO, but this is only the tip of the iceberg. As devs, we used it to solve more issues, such as:
- Creating dedicated buckets for dynamic environments
- Pretesting private buckets accessing for heavily secure applications
- Integrating MinIO as a part of CI/CD pipeline with automated integration testing.

I hope that this article will make your life easier and allow you to simplify the process of deploying your application.
Feel free to check out the example project on Github https://github.com/mateuszjasinski/Django-MinIO


