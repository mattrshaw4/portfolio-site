---
title: "How Level-Up Bank Built A Highly Scalable Apache Web Architecture on AWS Using ALB and Auto Scaling"
summary: "A scalable Apache web tier on AWS: VPC, launch template, Application Load Balancer and an Auto Scaling group."
kind: medium
date: 2025-11-24
mediumUrl: "https://medium.com/@matt.r.shaw4/how-level-up-bank-built-a-highly-scalable-apache-web-architecture-on-aws-using-alb-and-auto-scaling-3b8106767db7"
tags: ["load-balancing","cloud-computing","ec2","aws","vpc"]
---

![](/images/writing/how-level-up-bank-built-a-highly-scalable-apache-web-architecture-on-aws-using-alb-and-auto-scaling/img-1.png)

Created with draw.io

After Its first successful test in the AWS ecosystem Level Up Bank Is ready to move it’s entire network. They created VPC with a [CIDR](https://aws.amazon.com/what-is/cidr/) of 10.10.0.0/16.

Then they create three public subnets with CIDR blocks of 10.10.1.0/24, 10.10.2.0/24, and 10.10.3.0/24. These subnets will be used to host an autoscaling group of t2.micro instances with Apache installed on each instance.

Modern cloud environments demand applications that can scale automatically, maintain high availability, and serve users reliably across multiple availability zones.

### Why Move You’re Entire Network to the Cloud?

1.  **Scalability**

-   The banks Infrastructure needs to be flexible AWS provides the ability to scale up and down based on business volume
-   This avoids large upfront costs and maintenance on hardware
-   You only pay for what you actually use

2\. **Reliability**

-   AWS provides a monitoring and managing tools system to help proactively identify and address potential issues before it impacts customers
-   Reliable infrastructure with multiple availability zones and automatic fail-over capabilities.
-   Significantly reduced downtime's and disruptions

3\. **Security**

-   AWS provides robust security features, including encryption, access controls, and network security, to help protect against cyber attacks
-   The bank can take advantage of these security features and improve the security of its infrastructure and customer data.
-   This will satisfy the banks strict regulatory compliance

4\. **Cost Savings**

-   AWS has pay-as-you-go pricing that reduces the high up front costs of running and maintain and physical On-Prem server
-   The Bank can make more accurate budgets and use the savings on services and offerings

5\. **Flexibility**

-   AWS gives the bank the ability to change and adapt fast and spin up new instances
-   Test new features
-   Experiment with configurations.
-   Gives them a competitive advantage in a tight market

## Lets Create Our Cloud Network.

1.  **Create a VPC**

-   Select “VPC Only " with CIDR of 10.10.0.0/16 → Create VPC

![](/images/writing/how-level-up-bank-built-a-highly-scalable-apache-web-architecture-on-aws-using-alb-and-auto-scaling/img-2.png)

2\. **Create 3 Public Subnets**

-   Navigate to **VPC → Subnets → Create Subnet**
-   Select your new VPC

![](/images/writing/how-level-up-bank-built-a-highly-scalable-apache-web-architecture-on-aws-using-alb-and-auto-scaling/img-3.png)

-   Repeat same process for the other 2 subnets

![](/images/writing/how-level-up-bank-built-a-highly-scalable-apache-web-architecture-on-aws-using-alb-and-auto-scaling/img-4.png)

-   Once all Subnets are created go to each subnet's settings and turn on “Auto Assign Public IPv4 Address”

![](/images/writing/how-level-up-bank-built-a-highly-scalable-apache-web-architecture-on-aws-using-alb-and-auto-scaling/img-5.png)

4\. **Create Internet Gateway**

-   Go to **VPC → Internet Gateways → Create Internet Gateway**
-   After the Internet Gateway is created, click **Actions → Attach to VPC**, and attach it to your VPC.

5\. **Create Public Route Table**

-   **VPC** → **Route Tables** → **Create Route Table**  
    Name it and associate it with your VPC
-   Open the new route table → Routes → Edit routes
-   Add: Destination: 0.0.0.0/0
-   Target: Internet Gateway. Save changes.
-   Under Subnet Associations, associate all three public subnets with this route table.

6\. **Create a Launch Template**

-   **Instance type:** t.2 micro
-   **AMI:** Amazon Linux 2023
-   **User Data script:** Installs Apache

![](/images/writing/how-level-up-bank-built-a-highly-scalable-apache-web-architecture-on-aws-using-alb-and-auto-scaling/img-6.png)

-   **Network settings:** Enable **Auto-Assign Public IP**

7\. **Create Security Groups**

**Load Balancer Security Group**

-   Go to **EC2/Security Groups/Create Security Group**

**Inbound rule:**

-   Type: HTTP
-   Port: 80
-   Source: 0.0.0.0/0

**Outbound rules:** leave default

**Web Server Security Group**

-   Create new security group
-   **Inbound rule:**
-   Type: HTTP
-   Port: 80
-   Source: ALB’s security group
-   **Outbound rules:** keep default

8\. **Application Load Balance (ABL)**

-   **Listener:** HTTP (port 80)
-   **Subnets:** Select all three public subnets you just created
-   **Security Group:** New group that allows **HTTP** traffic from 0.0.0.0/0
-   **Security Group:** Create a new one for your web servers that allows **HTTP** traffic **only** from your **Application Load Balancer’s security group**.

9\. **Target Group**

-   **Type:** Instances
-   **Protocol:** HTTP
-   **Port:** 80
-   **VPC:** Same one as your EC2s (10.10.0.0/16)
-   **Attach:** This target group to your ALB listener

10\. **Auto Scaling Group (ASG)**

-   **Launch Template:** EC2 Launch templated you created earlier
-   **Desired capacity:** 2
-   **Minimum capacity:** 2
-   **Maximum capacity:** 5
-   **Subnets:** Select your three public subnets
-   **Target group:** Attach Your Target Group (Type: Instances)
-   **Health checks:** Use **Load Balancer health checks** for accuracy

To verify go to **EC2** then **Load Balancers** copy **DNS name** of your **ALB**. Paste it into your browser you should see ‘it works!’.
