---
layout: post
title: Tutorial - Modding and Re-Installing an iOS App
description: How to change and re-install an iOS app on your test device (without too much suffering)
last_modified_at:
author: "@saulpanders"
comments: true
tags: mobile, ios, security, frida, ipa, codesign, AMDeviceSecureInstallApplication, macos, apple, sideloadly
---

This post is on the shorter side, designed to be a walkthrough on modding `.ipa` files. I wrote this mostly so I don't have to grep through my shell history or `ctrl+r` in terminal to remember what I did eight months ago (i.e. the typical duration between iOS projects).

<b>Note</b>: This tutorial assumes you have access to a MacOS device and valid Apple ID. Some of the following will still work on Linux, but I won't be going through that. Good luck, stay strong - you're on your own there. 

# iOS App Signing

Let's say you've been given an already compiled, signed, and packaged app bundle (`.ipa` file) for an iOS application, and you want to modify the app. You go to install it on your test device and you get an error like one of these:


![err1](\assets\img\2025-03-23-modding-ipas\provisioning_profile.png)

![err2](\assets\img\2025-03-23-modding-ipas\os_version.png)

![err3](\assets\img\2025-03-23-modding-ipas\device_unsupported.png)

Or worst of all:

![err4](\assets\img\2025-03-23-modding-ipas\unknown_err.png)

Oof, what to do? Fret not, the fix is pretty simple - we need to modify the `.ipa` so it will run on our device. After we do the mod, we will have to repack and re-sign the app bundle with our temporary developer certificate, which we will do together through this walkthrough. 


## Checklist

At a high-level, the steps to modify an app package are as follows:

- unpack app
- make change
- create new provisioning profile / entitlements
- delete code signature
- re-sign app


## Tutorial

### Unpack App Bundle
`.ipa` files [are just zip files with a special wrapper](https://en.wikipedia.org/wiki/.ipa), so we `unzip` to extract the contents of the package. This should create a directory called `Payload`, whose contents are the actual app binary and associated resources.

```
unzip ipa_file.ipa
```

#### Aside:
If instead you want to inspect an `.ipa` you downloaded from the app store, use [Frida iOS Dump](https://github.com/AloneMonkey/frida-ios-dump) to extract the `.ipa` from a jailbroken iPhone. If you mod the `.ipa` file after dumping, the steps in this walkthrough will also let you re-install the app. 


### Modify the App
One of the simplest and most frequent changes one might make is modding the main property list (`plist`) file for the application, [`Info.plist`](https://developer.apple.com/documentation/bundleresources/information-property-list). This file is responsible for important, over-arching configuration choices for the app, similar to `AndroidManifest.xml` on an Android app.

First, we enter the app bundle directory to access `Info.plist`:

```
cd ./Payload/ipa.filename.app/
```

Often times `Info.plist` is in a [binary plist format](http://fileformats.archiveteam.org/wiki/Property_List/Binary), so using [plutil](https://theapplewiki.com/wiki/Plutil) we convert it to `.xml` for readability. 

```
plutil -convert xml1 Info.plist
```

Now just use your favorite editor of choice and make your edit(s)! Check out some of the suggested modifications at the end of the post for inspiration. We don't technically need to convert `Info.plist` back to binary before re-signing, so lets leave it as-is for now.


### Provisioning Profile and Entitlements

Apple's security model means no unsigned code is allowed to run, period. For an iOS app, this means that the app bundle (`.ipa`) was signed with a valid code-signing certificate and contains a "provisioning profile" for the device that the app intends to run on. I [highly suggest reading this blog about code-signing on MacOS](https://dennisbabkin.com/blog/?t=how-to-get-certificate-code-sign-notarize-macos-binaries-outside-apple-app-store) before proceeding. 

#### The Gist of a Provisioning Profile:
- <b>App ID</b>: A unique identifier for the app.
- <b>Certificates</b>: These verify the identity of the developer and are used to sign the app.
- <b>Devices</b>: For development profiles, the devices (like iPhones or iPads) that the app will run on are specified.
- <b>Entitlements</b>: Certain capabilities (like push notifications or iCloud) that the app might require.

To create and use a provisioning profile, you need an Apple Developer account (which is free, so long as you don't intend on publishing to the App Store).

Before proceeding, make sure you follow the [steps to create a development provisioning profile with your Apple ID](https://developer.apple.com/help/account/provisioning-profiles/create-a-development-provisioning-profile).

At a high level, to get our provisioning profile we must: 
- Create a new iOS app project in XCode
- Build (and optionally install) the new blank app
- Extract the mobile provisioning profile XCode generated from our Apple ID
- Copy that provisioning profile into our modded app. 

Or more explicitly, first create a new XCode project.

![xc1](\assets\img\2025-03-23-modding-ipas\xcode1.png)

Specify a new iOS app, and hit the next button.

![xc2](\assets\img\2025-03-23-modding-ipas\xcode2.png)

Put anything for the name, we aren't going to need the app beyond the provisioning profile. Hit next when you're ready.

![xc3](\assets\img\2025-03-23-modding-ipas\xcode3.png)

This should bring up the XCode editor, with the new blank project template ready for us to build out-of-the-box. Before we build, make sure the build target is the device you wish to install the app on. If you haven't plugged your test device into the computer yet, now is a good time to do so.

![xc4](\assets\img\2025-03-23-modding-ipas\xcode4.png)

Last, hit the arrow button to build and install the app onto the test device automatically. 

![xc5](\assets\img\2025-03-23-modding-ipas\xcode5.png)

Now, we should have a provisioning profile associated with our temporary app that XCode auto-generated during the build process. It should be located somewhere in `~/MobileDevice/Provisioning\ Profiles/` as a file named `<guid>.mobileprovision`, where the GUID is a random value. Once you find the profile, extract the contents to another file with the `security` command. In this example we copy the profile to a file called `provision.plist`.

```
security cms -D -i ~/Library/MobileDevice/Provisioning\ Profiles/<guid>.mobileprovision > provision.plist
```

We can also parse out the [Entitlements](https://developer.apple.com/library/archive/documentation/Miscellaneous/Reference/EntitlementKeyReference/Chapters/AboutEntitlements.html) (which we need if we are manually re-signing) with the `Plistbuddy` utility. 

```
/usr/libexec/PlistBuddy -x -c 'Print: Entitlements' provision.plist > entitlements.plist
```

Also be sure to parse out any custom entitlements from the modded app's legitimate `embedded.mobileprovision` file and add them (manually) to your new `provision.plist` you got from XCode. 

Most of the time, this is just asking for keychain access or `get-task-allow` access, so its not strictly necessary to copy entitlements. However, if the app is heavily integrated with Apple's native services (iCloud, etc) then ignoring the original entitlements will impact how the modded app functions. If you skip this step and run into errors with the app at install or run-time, maybe circle back and re-sign with the proper entitlements in the provisioning profile. 

Phew, now we are (almost) ready to do the signing. Next, we have to remove some existing artifacts like the old code-signing signatures.

### Remove Old Artifacts
simply put, we nuke all existing `_CodeSignature` directories and their contents, including any code signatures located within framework directories inside contained within the `Payload` directory. From within `Payload`, run the following.

```
find . -type d -name "_CodeSignature" -exec rm -rf {} +
```

Also, be sure to remove the original `embedded.mobileprovision` file from the app bundle. Essentially, we are replacing this with the `provision.plist`, so we have no need for it anymore. Now, we're all set to re-package and re-sign the app,


### Re-Sign

First, we pack all the contents of the `Payload` directory into a new `ipa` file. The file name doesn't matter for the next steps, so I've called it `modded.ipa`.

```
zip -qr modded.ipa Payload
```
At this point, we have three choices, depending on how we wish to proceed. I'm only going to fully outline the method I like to use, but will mention the other two for completeness sake. 

#### iOS App Signer
My personal favorite method to use at this step is [iOS App Signer](https://github.com/DanTheMan827/ios-app-signer), because I value the simplicity of the interface. I've tried the manual way before with varying degrees of success, and eventually just said "screw it" and started using the iOS App Signer tool (locally, of course).

Make sure you select the correct provisioning profile and signing certificate in the menu screen. The other options don't make much of a difference. 

![appsign](\assets\img\2025-03-23-modding-ipas\ios_app_sign.png)

#### Manual Signing

Instead of using iOS App Signer, you could just perform the steps it performs manually with the native `codesign` utility. However, I find this method tedious, as you can run into unexpected hiccups (by not signing a framework file properly, by signing in the wrong order, etc). First, we use the native `Security` command (on MacOS) to locate our code-signing identity, which is tied to our Apple ID. You will need the name of the signing profile for the next step. 

```
security find-identity -v -p codesigning
```
Then, you must codesign <i>every single executable file</i> within your app bundle, and the bundle itself. This includes any framework binaries or additional libraries, so you can see why this method is fairly tedious. The command to actually sign a binary is as follows.
```
codesign -f -s 'devcert name' --entitlements entitlements.plist <file to sign>
```

#### Sideloadly
If you don't have a Mac, but <i>do</i> have an Apple ID, you can use [Sideloadly](https://sideloadly.io/) with a Linux box to perform the re-signing and installation of the modded package. I haven't personally used Sideloadly much, but I have a colleague who swears by it, so I figured it deserved mentioning.


### Install Modded App
Once you have your repacked and correctly re-signed app, just use [ios-deploy](https://github.com/mathworks/ios-deploy) to deploy it to your test device. 

```
ios-deploy -b resigned_repacked.ipa
```
If you hit 100% during the install, as depicted below, then everything worked! 

![success](\assets\img\2025-03-23-modding-ipas\success.png)

You may still need to trust your developer's certificate within your device's settings, otherwise the app will fail to launch. Go to the devices `Settings > General > VPN & Device Management`

![mgmt](\assets\img\2025-03-23-modding-ipas\mgmt.png)

Select the "Developer Certificates" and verify yourself.

![verify](\assets\img\2025-03-23-modding-ipas\verify.png)


### Info.plist Modding Ideas

Here are a few ideas or scenarios highlighting why you might mod a packaged `.ipa`. If successful, any of these changes represent a failure of the app's resilience to tampering. All of these changes just involve just modifying settings in  `Info.plist`, but you <i>could</i> do something more fun, like patching the main executable file... But that's a discussion for another post.

#### Change Supported Device 
Sometimes an app is designed to only run on specific devices (i.e. iPads), and wont install on an iPhone. We can change this by modifying the `UIDeviceFamily` setting to specify which device platform the app supports (1 for iPhone/iOS, 2 for iPad)

```
<key>UIDeviceFamily</key>
<array>
	<integer>1</integer>
<array>
```

#### Downgrade Network Security

[ATS (App Transport Security)](https://developer.apple.com/documentation/security/preventing-insecure-network-connections) is a security feature introduced by Apple in iOS 9. It enforces secure network connections by requiring that all HTTP connections be made over HTTPS with strong encryption, and is "ON" by default unless explicitly disabled. 

Here are examples to either To disable ATS outright, or create specific exceptions in the `Info.plist` file.

```
c<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>

## OR

<key>NSAppTransportSecurity</key>
<dict>
    <key>NSExceptionDomains</key>
    <dict>
        <key>anydomain.com</key>  #  Replace with the domain you want to exclude 
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

#### Change Minimum iOS Version Supported
Changing this key will only bypass the initial OS version checks at install-time. The app may still crash or fail to run due to OS-level differences between major iOS versions and what the app's executable expects. 

```
<key>MinimumOSVersion</key>
<string>13.0</string>
```



## Sources:

- [Wikipedia - .ipa](https://en.wikipedia.org/wiki/.ipa)
- [Frida iOS Dump](https://github.com/AloneMonkey/frida-ios-dump)
- [Info.plist - Apple Developer Documentation](https://developer.apple.com/documentation/bundleresources/information-property-list)
- [Plutil - TheAppleWiki](https://theapplewiki.com/wiki/Plutil)
- [How to Get Certificate, Code Sign, and Notarize MacOS Binaries Outside Apple App Store](https://dennisbabkin.com/blog/?t=how-to-get-certificate-code-sign-notarize-macos-binaries-outside-apple-app-store)
- [Create a Development Provisioning Profile](https://developer.apple.com/help/account/provisioning-profiles/create-a-development-provisioning-profile)
- [Entitlements - Apple Developer Documentation](https://developer.apple.com/library/archive/documentation/Miscellaneous/Reference/EntitlementKeyReference/Chapters/AboutEntitlements.html)
- [iOS App Signer - GitHub](https://github.com/DanTheMan827/ios-app-signer)
- [Sideloadly](https://sideloadly.io/)
- [ios-deploy - GitHub](https://github.com/mathworks/ios-deploy)
- [App Transport Security - Apple Developer Documentation](https://developer.apple.com/documentation/security/preventing-insecure-network-connections)