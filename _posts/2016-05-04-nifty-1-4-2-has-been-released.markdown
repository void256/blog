---
layout: post
title:  "Nifty 1.4.2 has been released"
date:   2016-05-04 01:00:00
categories: blog update
comments: true
image:
  feature: logo.png
---
Nifty 1.4.2 contains bugfixes and features. There might be some minor run-time incompatibilities with prior 1.4.x versions - but only minor ones.

Kudos to the following 1.4.2 committers (alphabetical order):

* Aaron Mahan
* barefists
* bgroenks96
* Brian Groenke
* Cuchaz
* Dominic Jones
* dustContributor
* Genhis
* Ryszard-Trojnacki
* shamanDevel
* Teencrusher

Here are the download links for Nifty 1.4.2:

* [nifty-1.4.2-changelog.txt (sf.net)](http://sourceforge.net/projects/nifty-gui/files/nifty-gui/1.4.2/nifty-1.4.2-changelog.txt/download)
* [nifty-1.4.2.zip (sf.net)](http://sourceforge.net/projects/nifty-gui/files/nifty-gui/1.4.2/nifty-1.4.2.zip/download)
* [Nifty 1.4.2 Maven Projects Page (browse the JavaDoc online!)](http://nifty-gui.sourceforge.net/projects/1.4.2/index.html)
* [Nifty 1.4.2 Tag on github (browse source online)](https://github.com/void256/nifty-gui/tree/nifty-main-1.4.2)

For all Maven users:

* **Nifty 1.4.2 is available in the Maven central** :)
* The groupId has changed from `de.lessvoid` to `com.github.nifty-gui`

{% highlight XML %}
<dependency>
<groupId>com.github.nifty-gui</groupId>
<artifactId>nifty</artifactId>
<version>1.4.2</version>
</dependency>
{% endhighlight %}

### We need less external dependencies now

The following dependencies are NOT needed anymore on the classpath and should actually be **removed** from the runtime classpath (if you're not using Maven where this is managed automatically):

* eventbus-1.4.jar - has been integrated since we needed to fix a bug, see github issue [#364](https://github.com/nifty-gui/nifty-gui/issues/364)
* jglfont-core-1.4.jar - has been integrated since we didn't want to have that project in the maven central
* jorbis-0.0.17.jar - has been integrated since it was not available in the Maven central which would have been required for Nifty to be there

### Quickstart/Demo/Test for none Maven users

You can run the following commands to download and run the Nifty examples from a commandline prompt. The commands given are for running the examples on Mac OS X but it should be easily modifiable to run under Windows and Linux as well.

{% highlight bash %}
# This runs the LWJGL example but you can use the same mechanism to run the examples for the
# other supported systems as well. Just swap-out the nifty-*-renderer jar.
cd /tmp
mkdir nifty-1.4.2
cd nifty-1.4.2

# of course you can download this manually as well
curl -O -L http://sourceforge.net/projects/nifty-gui/files/nifty-gui/1.4.2/nifty-1.4.2.zip
unzip nifty-1.4.2

# since we want to run the LWJGL example we download LWJGL as well
curl -O -L http://sourceforge.net/projects/java-game-lib/files/Official%20Releases/LWJGL%202.9.3/lwjgl-2.9.3.zip
unzip lwjgl-2.9.3.zip

# now run the de.lessvoid.nifty.examples.lwjgl.defaultcontrols.ControlsDemoMain example using lwjgl
java -cp \
nifty-1.4.2/nifty-1.4.2.jar:\
nifty-1.4.2/nifty-default-controls-1.4.2.jar:\
nifty-1.4.2/nifty-style-black-1.4.2.jar:\
nifty-1.4.2/nifty-lwjgl-renderer-1.4.2.jar:\
nifty-1.4.2/nifty-openal-soundsystem-1.4.2.jar:\
nifty-1.4.2/nifty-examples-lwjgl-1.4.2.jar:\
nifty-1.4.2/nifty-examples-1.4.2.jar:\
nifty-1.4.2/dependencies/xpp3-1.1.4c.jar:\
lwjgl-2.9.3/jar/lwjgl.jar \
-Djava.library.path=lwjgl-2.9.3/native/macosx/ \
de.lessvoid.nifty.examples.lwjgl.defaultcontrols.ControlsDemoMain
{% endhighlight %}

void
