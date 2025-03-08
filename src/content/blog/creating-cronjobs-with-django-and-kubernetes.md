---
title: 'Creating Cron jobs with Django and Kubernetes'
description: 'Most developers use Celery or RabbitMQ for handling periodic tasks in Django or general python web apps. In this article, I would like to show you, how you can use Kubernetes Cron Job to replace your current scheduler configuration'
pubDate: 'Jul 08 2022'
tags: 'Kubernetes'
---

Most developers use Celery or RabbitMQ for handling periodic tasks in Django or general python web apps. In this article, I would like to show you, how you can use Kubernetes Cron Job to replace your current scheduler configuration.

#### Celery Config
First, I’d like to explain why I think Celery can be an overkill for some of your projects.

What do you need to start scheduling tasks with Celery?

- First, you’ll need to create a Celery worker. It will be running in the background all the time and consume resources even if it is not used
- In order to schedule tasks, you also need to create a Celery Beater that is going to serve as your timer
- The last needed is a Broker. In most cases, you will use Redis to store a queue of your tasks.

As you can see, it’s necessary to create three additional services that are running non-stop but will be used only when the task pops up. If your application generates a minor amount of tasks, your Celery configuration will be idle most of the time.

#### Django Commands + Kubernetes Cron Job
In this approach, we want to replace our Celery configuration by using Kubernetes Job for the periodical task, e.g., sending daily updates, etc. This solution allows us to start containers on demand, so I will run only when needed and use resources during execution. As soon as your task is completed, Kubernetes will kill your containers, and resources will be released. Let’s jump to an example.

##### Example
For the purposes of the article, we want to create a job that will handle the deactivation of auctions if the user didn’t make any offers and the auctions are older than one week.

##### Django command
We need to start with creating a custom Django Command that will handle deactivating the actions. Having the command ready we’re able to test it as many times as we need/want to. If you need any help with creating a command check https://docs.djangoproject.com/en/4.1/howto/custom-management-commands/

```python

from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db.models import Q
from auction.models import Auction

class Command(BaseCommand):
  def handle(self, *args, **opitons):
    date_to_check = datetime.now() - timedelta(days=7)
    auctions = Auction.objects.filter(
        Q(create_time__lte=date_to_check),
        Q(offers=None),
        Q(is_active=True)
    )
    auctions.update(is_active=False)
```

##### Kubernetes job
The next step is to create a Kubernetes cron job manifest. Below I’ll show you an easy example, for more reference visit https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

```yaml
apiVersion: batch/v1beta1
kind: CronJob
meta:
  name: offerCron
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
           - name: offer-cron-container
             image: offer-app-backend
             command: ["bash"]
             args: ["-c", "python /source/manage.py run_crons.py"]
          restartPolicy: OnFailure
```

#### Summary
As mentioned, you can painlessly replace your easy Celery Tasks using Django Commands and Kubernetes. Of course, you first need to use Kubernetes in your project, so this solution will not apply to all of your projects, but if you have the option to use this approach, you will be satisfied with the final results.