---
title: "Scaling Luxury: Aurora Digital’s Automated AWS Migration with CloudFormation"
summary: "Created using Chat GPT"
kind: medium
date: 2025-12-01
mediumUrl: "https://medium.com/@matt.r.shaw4/scaling-luxury-aurora-digitals-automated-aws-migration-with-cloudformation-8dce0c877d77"
tags: ["ec2","cloudformation","apache","cloud-computing","aws"]
---

![](/images/writing/scaling-luxury-aurora-digitals-automated-aws-migration-with-cloudformation/img-1.png)

Created using Chat GPT

Aurora Digital is a growing online retailer specializing in luxury home goods and has decided to migrate its digital operation to AWS to take advantage of its cloud computing benefits. Aurora has been encountering major growth and needs a solution that can handle increasing customer traffic and scale during major sales events without sacrificing performance or security.

To help Aurora Digital I need to execute a cloud-based infrastructure using AWS services that:

-   **Enhance Scalability:** Automatically adjust computing resources to meet demand, ensuring the platform remains operational and responsive during peak traffic periods.
-   **Increase Reliability:** Improve website uptime and reduce the risk of failures associated with physical hardware and manual interventions
-   **Improve Security**: Implement advanced security protocols and isolation through AWS to protect customer PII and transactions.
-   **Reduce Operational Costs:** Lower overall infrastructure costs by optimizing resource usage and eliminating the need for upfront hardware investments.

This can be accomplished by using AWS CloudFormation.

### Why Would I Use CloudFormation?

CloudFormation has several advantages over manual creation such as

-   **Automation:** Significantly reduces manual effort by automating the creation, updating, and deletion of AWS resources, which saves time and minimizes configuration errors.
-   **Consistency:** Ensures consistent environments are created every time, crucial for testing and production stages, thereby eliminating the “it works on my machine” problem.
-   **Version Control:** Allows infrastructure to be version-controlled and reviewed as part of application code, enhancing collaboration among team members and rollback capabilities.
-   **Reutilization:** Enables reusing templates across the company or community, speeding up future deployments and ensuring best practices are followed.

I started by writing my CloudFormation template in **json** format.

### What the Stack Deploys

**Security Group Configuration:**

-   Allows SSH (port 22) access from the internet
-   Allows HTTP (port 80) access from the internet

**EC2 Instance Details:**

-   Launched in the default VPC and subnet
-   SSH access
-   Based on an Amazon Linux AMI

**Executes a User Data Script at Launch to**:

-   Install the Apache web server
-   Start the Apache service
-   Generate a custom index.html page: “Welcome to Aurora Digital”

### How to Deploy

-   AWS Console → CloudFormation → Create Stack → Upload json file
-   Fill in parameters

![](/images/writing/scaling-luxury-aurora-digitals-automated-aws-migration-with-cloudformation/img-2.png)

-   **Submit**
-   Wait for confirmation “CREATE\_COMPLETE”

![](/images/writing/scaling-luxury-aurora-digitals-automated-aws-migration-with-cloudformation/img-3.png)

-   Verify with Public Ip

![](/images/writing/scaling-luxury-aurora-digitals-automated-aws-migration-with-cloudformation/img-4.png)

-   Success!

Aroura Digital is now ready to handle the increased demands of their business more efficiently while remaining secure and lowering infrastructure costs.
