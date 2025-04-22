---
layout: post
title: Another New Years LOLBAS!
description: Abusing Windows Management Instrumentation tool wbemtest.exe for arbitrary command execution
last_modified_at:
author: "@saulpanders"
comments: true
tags: security, red team, windows, wmi, lolbas, cim, lolbin, com, wbem, awl bypass, command execution
---
Whoa deja vu! A New Year and *another* new [LOLBAS](https://lolbas-project.github.io/)? I swear I'm not hoarding these or anything, life is just funny like that. Every now and then when I'm bored I like to go through the binaries on my Windows machine to see what low hanging fruit (if any) there might be left to pick... and boy was there!

<b>Introducing:</b> `wbemtest.exe`

This bad boy is essentially a GUI interface for interacting with [WMI](https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page)  and [CIM](https://learn.microsoft.com/en-us/windows/win32/wmisdk/common-information-model) classes directly, even from a low-privileged context. 

I refused to believe no one had written up this tool before as a LOLBAS, but sure enough, a quick search through the repo proved that this was in fact "new research". 

![notfound](/assets/img/2025-01-20-another-new-lolbas/notfound.png)

It feels kinda silly to call this "research", but when it comes to success in research projects, I'll take whatever wins I can get. 

Before we can get into the fun of all the things we can do with this binary, we first need a brief review on Windows Management Interface (WMI).

# Windows Management Interface (WMI)

I'll omit a history and deeper dive on the inner workings of WMI (for now). All you really need to understand is that WMI was developed as a response to the rise of [Web Based Enterprise Management (WBEM)](https://en.wikipedia.org/wiki/Web-Based_Enterprise_Management) solutions in the late 90s and early 2000s, and it piggybacks off of the [CIM](https://en.wikipedia.org/wiki/Common_Information_Model_(computing)) and [WS-Management](https://en.wikipedia.org/wiki/WS-Management) standards.  

A high-level view of WMI is depicted below, courtesy of [Matt Graeber's Black Hat Presentation](https://www.blackhat.com/docs/us-15/materials/us-15-Graeber-Abusing-Windows-Management-Instrumentation-WMI-To-Build-A-Persistent%20Asynchronous-And-Fileless-Backdoor-wp.pdf)

![wmi](/assets/img/2025-01-20-another-new-lolbas/wmiarch.png)

## Common Information Model (CIM)
Using WMI, developers can leverage the [CIM (Common Information Model)](https://www.dmtf.org/standards/cim) to define classes that represent various components, such as hard drives, software applications, network routers, or custom-defined technologies. By accessing and modifying these CIM classes, administrators can oversee and control the disparate parts of the enterprise in a more centralized manner. 

For instance, one might retrieve information from a CIM class that models a workstation computer, and then execute a script to alter its configuration. WMI would translate any change to the workstation CIM class instance into a change to the actual workstation.

CIM is a platform-independent, object-oriented model designed to describe elements within an enterprise. It is designed to present a consistent view of logical and physical objects in a management environment. CIM defines managed resources using "classes", similar to those in C++ or COM, which include properties for defining data and methods for defining behavior. 

Like COM classes, the CIM is not tied to any one particular platform. However, WMI includes an extension to the CIM that describes the Microsoft Windows operating system platforms. COM is a whole entire other discussion that I'd like to write up, but not today...

**TL;DR**: Effectively, WMI is the interface on Windows for managing resources that uses a CIM syntax under the hood. `Wbemtest.exe` provides an entry point into messing with WMI and CIM definitions directly. 

# Wbemtest.exe LOLBIN

To locate the binary on your machine, browse to `C:\Windows\System32\wbem` as shown below.

![wbemloc](/assets/img/2025-01-20-another-new-lolbas/wbemloc.png)

I already had this folder in my PowerShell Path, so I just ran `wbemtest.exe` to bring up the GUI displayed below.

![wbemloc](/assets/img/2025-01-20-another-new-lolbas/wbemtest_basic.png)

This is `wbemtest.exe`, in all its glory! Before we can proceed, we need to connect to a namespace to begin leveraging the existing WMI classes. Hit the `Connect` button to bring up a dialog that allows you to select the namespace. You can use the default namespace value of `root\cimv2` and just hit `Connect` again to proceed.

![wbemconntect](/assets/img/2025-01-20-another-new-lolbas/wbemtest_connect_dialog.png)

Note that this dialog menu provides the ability to connect to remote machines in an authenticated context. We're only going to explore local functionality available to us, but we <i>could</i> just as easily connect to a remote computer over WMI and interact with remote resources. 

### Aside: IWebmLocator class
I glossed over what the `Connection` we're using: 
Use the IWbemLocator interface to obtain the initial namespace pointer to the IWbemServices interface for WMI on a specific host computer. You can access Windows Management itself using a `IWbemServices` pointer, which is returned by the [`IWbemLocator::ConnectServer`]( https://learn.microsoft.com/en-us/windows/win32/api/wbemcli/nf-wbemcli-iwbemlocator-connectserver) method.

Here's where we see CIM, WMI, and COM all come together. A client or provider that requires Windows Management services first obtains a pointer to the locater using CoCreateInstance or CoCreateInstanceEx, just as you would for a COM object, since the IWbemLocator object is *always* an in-process COM server. We then obtain the interface pointer to the desired namespace on the desired target computer through the `IWbemLocator::ConnectServer` method, which is the only method available on this interface.

From here we can interact with WMI services in a programmatic way using the [IWebmServices Interface](https://learn.microsoft.com/en-us/windows/win32/api/wbemcli/nn-wbemcli-iwbemservices). The interface is implemented by WMI and WMI providers, and is the primary WMI interface.

## Demo: Command Execution
The easiest and most obvious use for this tool would be seeing if there is some way we can invoke the `Create` method on the `Win32_Process` WMI class. Sure enough, with a little bit of poking around we're able to run any commands we want!

For starters, we're going to want to use the `Execute Method` option in the GUI. This will bring up a input dialog asking us to specify the object whose methods we wish to execute. In this example, enter `Win32_Process` and hit OK.

![execmethod](/assets/img/2025-01-20-another-new-lolbas/win32process-executemethod.png)

This brings up <i>yet another</i> GUI, which lets us select which method of `Win32_Process` we want to execute. On the drop-down menu, make sure `Create` is highlighted. Don't click `Execute` just yet! We have one more step to take.


![create](/assets/img/2025-01-20-another-new-lolbas/create_method-process.png)

At the bottom of this dialog box is a button labeled `Edit In Parameters`. Hit that to bring up <i>another</i> menu which will let us customize the "In Parameters" to the method call. 

![inparam](/assets/img/2025-01-20-another-new-lolbas/inparams.png)

We are specifically interested in the parameter `CommandLine`, which you'll have to scroll down to see. Hit the `Edit Property` button once `CommandLine` is highlighted.

![edit1](/assets/img/2025-01-20-another-new-lolbas/edit_param.png)

This brings up an interface for editing the `CommandLine` property itself. First, toggle the Value from `NULL` to `not NULL`. 

![edit1](/assets/img/2025-01-20-another-new-lolbas/edit_param2.png)

Here's where we choose the command we want to run. You can use the full path to a binary, or just specify one already in your path. As a classic test example, lets run `calc.exe`. Hit the `Save Property` button to record this change and then exit this dialog. 


![edit2](/assets/img/2025-01-20-another-new-lolbas/editproperty_save.png)

We should return back to the `Execute Method` interface. If we've followed the steps properly, we should pop an instance of `calc.exe` as soon as we `Execute!`


![calc](/assets/img/2025-01-20-another-new-lolbas/execute-calc.png)

![calc2](/assets/img/2025-01-20-another-new-lolbas/calc.png)

Here's a view of the parent-process relationship for this command in Process Hacker. Since we ran this command through the WMI object `Win32_Process`, we see that we're running in a Shell Infrastructure host process (`sihost.exe`) that originated from a Windows Service Host (`svchost.exe`) process. 

![calcproc](/assets/img/2025-01-20-another-new-lolbas/calc_parent_process.png)

## Conclusion

There you have it! Free command execution through WMI via `wbemtest.exe`. Not the most exciting piece of research, but it does provide an interesting way to interact with WMI directly without the need of PowerShell or Command Prompt. 

Something I glanced over in this example is the various options that exist in the initial `Connection` dialog pane. Its highly likely you could leverage this LOLBIN to connect to a remote computer and run commands over WMI/DCOM. Possibly even leak NTLM or coerce authentication. For now, I'll leave it at just "command execution", but I suspect theres more we can do to abuse `wbemtest.exe`...

**My 2 Cents**: It is probably a good idea to block this binary with some form of application allow listing. I can't think of a good reason for a normal user to have this binary, and a sysadmin would probably just use PowerShell or some other programmatic interface for interacting with WMI instead of a GUI-based tool.  


**About the title**: I originally wrote this post around New Years 2025, but then got busy/sidetracked and forgot about it until now. So yes, this is a "New Years" post, but I actually finished writing it in April, and I won't be changing the title.

## Source(s):
- [LOLBAS Project](https://lolbas-project.github.io/)
- [WMI Start Page – Microsoft Docs](https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page)
- [CIM Overview – Microsoft Docs](https://learn.microsoft.com/en-us/windows/win32/wmisdk/common-information-model)
- [Web-Based Enterprise Management – Wikipedia](https://en.wikipedia.org/wiki/Web-Based_Enterprise_Management)
- [Common Information Model (Computing) – Wikipedia](https://en.wikipedia.org/wiki/Common_Information_Model_(computing))
- [WS-Management – Wikipedia](https://en.wikipedia.org/wiki/WS-Management)
- [Black Hat 2015 – Matt Graeber WMI Abuse Whitepaper](https://www.blackhat.com/docs/us-15/materials/us-15-Graeber-Abusing-Windows-Management-Instrumentation-WMI-To-Build-A-Persistent%20Asynchronous-And-Fileless-Backdoor-wp.pdf)
- [CIM Standards – DMTF](https://www.dmtf.org/standards/cim)
- [IWbemLocator::ConnectServer – Microsoft Docs](https://learn.microsoft.com/en-us/windows/win32/api/wbemcli/nf-wbemcli-iwbemlocator-connectserver)
- [IWbemServices Interface – Microsoft Docs](https://learn.microsoft.com/en-us/windows/win32/api/wbemcli/nn-wbemcli-iwbemservices)
- [Process Hacker](https://processhacker.sourceforge.io/)

		